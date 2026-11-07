import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import { general } from "#/shared/database/general-db";
import { logErrorMsg } from "#/utils/config/log-utils";
import { processDonatePayment, removeDonateGroup } from "#/utils/payment/process-donate-payment";
import { callServerCommand, type CommandMeta } from "#/utils/server/call-command";
import {
	GAME_CURRENCIES,
	STORE_COMMAND_PARENTS,
	type GameCurrency,
} from "@repo/shared/schemas/store/payment";
import {
	credit,
	debit,
	economyTransaction,
	flushProjections,
	type ApplyResult,
	type EconomyTrx,
	type LedgerEntry,
} from "#/modules/economy/wallet.model";
import {
	enqueueGrantJob,
	processGrantJobs,
	registerGrantHandler,
} from "#/modules/economy/grant-jobs.model";
import {
	deliveryLockKey,
	parseEffectSnapshot,
	resolveDeliveryEffect,
	type DeliveryCheck,
} from "./delivery-dedup";
import {
	checkEffectDuplicate,
	withDeliveryLocks,
} from "./delivery-dedup-db";

export const initialPrices: Record<string, number> = Object
	.fromEntries(GAME_CURRENCIES.map((currency) => [currency, 0]));

type Product = {
	recipient: string;
	id: number;
	price: string;
	priceSnapshot?: string;
	type: string;
	value: string;
	currency: string;
	title: string;
	command?: string | null;
	refundCmd?: string | null;
};

type GameChild = {
	id: number;
	store_item_id: number;
	recipient: string;
	line: number | null;
	type: string | null;
	value: string | null;
	command: string | null;
	refund_cmd: string | null;
	price: string | number | null;
	currency: string | null;
	effect: unknown;
	delivery_status: string;
	delivery_attempts: number;
	command_id: string | null;
};

type FulfillmentProduct = Pick<Product, "id" | "recipient" | "type" | "value" | "command"> & {
	childId?: number;
	line?: number;
};

/** Outbox kind for the non-money part of an order (groups, toasts, items). */
const FULFILLMENT_KIND = "store.fulfillment";

function createTasksForItem(
	{ recipient, type, value }: Pick<Product, "recipient" | "type" | "value">,
	{ fallbackServer }: { fallbackServer?: string } = {},
) {
	const tasks: Array<() => Promise<unknown>> = [];

	if (type === "donate") {
		const effect = resolveDeliveryEffect({ recipient, type: "donate", value });
		for (const task of processDonatePayment({ recipient, type: "donate", value, fallbackServer, effect })) {
			// The group grant is the paid effect; the toast and broadcast are
			// best-effort and must not leave a delivered order "processing"
			// forever when no game server is online.
			const bestEffort = task.name === "notify-player" || task.name === "broadcast-to-server";

			tasks.push(async () => {
				try {
					await task.execute(new AbortController().signal);
				} catch (error) {
					if (!bestEffort) throw error;

					logErrorMsg(error, { subject: "store-fulfillment-notify" });
				}
			});
		}
	}

	if (type === "event") {
		tasks.push(() => callServerCommand({
			parent: "cmi",
			value: `toast ${recipient} Поздравляем с покупкой!`,
			meta: { recipient, fallbackServer },
		}));
	}

	return tasks;
}

function renderCommand(template: string, vars: Record<string, string>): string {
	return template.replace(/\{(recipient|value|initiator|order_id|item_id)\}/g, (_, key: string) => vars[key] ?? "");
}

/**
 * A command template is a full console command: `lp user {recipient} ...`.
 * The parent is validated so a typo or a placeholder is never published to the
 * order stream, where it would be retried as a poison message.
 */
async function runCommandLine(line: string, meta?: CommandMeta): Promise<void> {
	const [parent, ...rest] = line.trim().split(/\s+/);
	const value = rest.join(" ").trim();

	if (!parent || !value) throw new Error("EMPTY_COMMAND");

	if (!(STORE_COMMAND_PARENTS as readonly string[]).includes(parent)) {
		throw new Error(`UNSUPPORTED_COMMAND_PARENT:${parent}`);
	}

	await callServerCommand({ parent: parent as never, value, meta });
}

async function isOrderRefunded(orderId: string): Promise<boolean> {
	const row = await (general as any)
		.selectFrom("payments_game")
		.select("refunded_at")
		.where("unique_id", "=", orderId)
		.executeTakeFirst();

	return Boolean(row?.refunded_at);
}

async function loadGameChildren(orderId: string): Promise<GameChild[]> {
	return await (general as any)
		.selectFrom("payments_game_childs")
		.selectAll()
		.where("order_id", "=", orderId)
		.orderBy("id", "asc")
		.execute() as GameChild[];
}

async function markChildDelivered(childId: number): Promise<void> {
	await (general as any)
		.updateTable("payments_game_childs")
		.set({
			delivery_status: "delivered",
			delivered_at: new Date(),
			delivery_attempts: sql`delivery_attempts + 1`,
			last_error: null,
		})
		.where("id", "=", childId)
		.where("delivery_status", "not in", ["revoked"])
		.execute();
}

async function markChildFailed(childId: number, error: unknown): Promise<void> {
	await (general as any)
		.updateTable("payments_game_childs")
		.set({
			delivery_attempts: sql`delivery_attempts + 1`,
			last_error: error instanceof Error ? error.message : String(error),
		})
		.where("id", "=", childId)
		.execute();
}

async function markChildRevoked(childId: number): Promise<void> {
	await (general as any)
		.updateTable("payments_game_childs")
		.set({
			delivery_status: "revoked",
			revoked_at: new Date(),
			last_error: null,
		})
		.where("id", "=", childId)
		.execute();
}

async function markChildRevokeFailed(childId: number, error: unknown): Promise<void> {
	await (general as any)
		.updateTable("payments_game_childs")
		.set({
			last_error: error instanceof Error ? error.message : String(error),
		})
		.where("id", "=", childId)
		.execute();
}

/**
 * A duplicate found after the charge is skipped and refunded per child. The
 * purchase itself stays intact, so a multi-item order keeps its other lines.
 */
async function refundSkippedChild(
	child: GameChild,
	orderId: string,
	initiator: string,
	reason: string,
): Promise<void> {
	const result = await economyTransaction().execute(async (trx) => {
		const claimed = await (trx as any)
			.updateTable("payments_game_childs")
			.set({
				delivery_status: "skipped",
				last_error: reason,
			})
			.where("id", "=", child.id)
			.where("delivery_status", "in", ["pending", "failed"])
			.returningAll()
			.executeTakeFirst() as GameChild | undefined;

		if (!claimed) return null;

		const currency = String(claimed.currency ?? child.currency ?? "") as GameCurrency;
		const amount = Number(claimed.price ?? child.price ?? 0);
		const applied: ApplyResult[] = [];

		if (GAME_CURRENCIES.includes(currency) && amount > 0) {
			applied.push(await credit(initiator, currency, amount, {
				// One ledger row per skipped child: the ledger is idempotent by
				// (order_id, reason), so the reason must include the child id.
				reason: `store.partial_refund:${currency}:${child.id}`,
				orderId,
				actor: "system",
				metadata: { reason, childId: child.id, source: "delivery-dedup" },
			}, trx));

			const order = await (trx as any)
				.selectFrom("payments_game")
				.select("price")
				.where("unique_id", "=", orderId)
				.forUpdate()
				.executeTakeFirst() as { price?: Record<string, number> | null } | undefined;

			if (order) {
				const price = { ...(order.price ?? {}) };
				price[currency] = Math.max(0, Number(price[currency] ?? 0) - amount);

				await (trx as any)
					.updateTable("payments_game")
					.set({ price })
					.where("unique_id", "=", orderId)
					.execute();
			}
		}

		const remaining = await (trx as any)
			.selectFrom("payments_game_childs")
			.select("id")
			.where("order_id", "=", orderId)
			.where("delivery_status", "not in", ["skipped", "revoked"])
			.executeTakeFirst();

		// Every line was skipped: the order is fully refunded without a revoke
		// job because nothing was delivered.
		if (!remaining) {
			await (trx as any)
				.updateTable("payments_game")
				.set({ refunded_at: new Date(), failure_reason: reason })
				.where("unique_id", "=", orderId)
				.where("refunded_at", "is", null)
				.execute();
		}

		return { applied };
	});

	if (result) await flushProjections(result.applied);
}

async function fulfill(
	products: FulfillmentProduct[],
	{
		initiator,
		orderId,
		childs,
		server,
	}: {
		initiator: string;
		orderId: string;
		childs: GameChild[];
		server?: string;
	},
): Promise<void> {
	for (const product of products) {
		// A refund may have been claimed while the job was waiting. Do not
		// deliver the rest; the revoke job will reverse what was already sent.
		if (await isOrderRefunded(orderId)) return;

		const child = product.childId
			? childs.find((row) => row.id === product.childId)
			: childs.find((row) => (
				row.store_item_id === product.id
				&& row.recipient === product.recipient
				&& (product.line == null || row.line === product.line)
			));

		if (
			child?.delivery_status === "delivered"
			|| child?.delivery_status === "revoked"
			|| child?.delivery_status === "skipped"
		) {
			continue;
		}

		const effect = parseEffectSnapshot(child?.effect) ?? resolveDeliveryEffect(product);

		const deliver = async () => {
			// An explicit command is the delivery: it replaces the built-in
			// type-specific behaviour and keeps other module integrations possible.
			if (product.command) {
				await runCommandLine(renderCommand(product.command, {
					recipient: product.recipient,
					value: product.value,
					initiator,
					order_id: orderId,
				}), {
					commandId: `${child?.command_id ?? randomUUID()}:delivery`,
					orderId,
					childId: child?.id,
					kind: "delivery",
					recipient: product.recipient,
					fallbackServer: server,
				});
			} else {
				for (const task of createTasksForItem(product, { fallbackServer: server })) {
					await task();
				}
			}

			if (child) await markChildDelivered(child.id);
		};

		try {
			if (!effect) {
				await deliver();
				continue;
			}

			await withDeliveryLocks([deliveryLockKey(product.recipient, effect)], async () => {
				const check = await checkEffectDuplicate(product.recipient, effect);

				// A concurrent checkout delivered the same permission while this
				// order was waiting. Refund only this line.
				if (check.duplicate) {
					if (child) {
						await refundSkippedChild(
							child,
							orderId,
							initiator,
							"PERMISSION_ALREADY_PRESENT",
						);
					}
					return;
				}

				await deliver();
			});
		} catch (error) {
			if (child) await markChildFailed(child.id, error);
			throw error;
		}
	}
}

/**
 * The route reads the cart before the lock. Re-read and lock the selected rows
 * inside the purchase transaction, and re-check the current item price, so two
 * tabs with different idempotency keys cannot both charge the same cart.
 */
async function lockAndValidateCart(
	trx: EconomyTrx,
	initiator: string,
	products: Product[],
): Promise<void> {
	const locked = await (trx as any)
		.selectFrom("store_cart_items")
		.select(["product_id", "recipient", "price_snapshot"])
		.where("initiator", "=", initiator)
		.where("selected", "=", true)
		.forUpdate()
		.execute() as Array<{
			product_id: number;
			recipient: string;
			price_snapshot: string;
		}>;

	const rowsByKey = new Map<string, Array<{ price_snapshot: string }>>();

	for (const row of locked) {
		const key = `${row.product_id}:${row.recipient.toLowerCase()}`;
		const rows = rowsByKey.get(key) ?? [];
		rows.push({ price_snapshot: row.price_snapshot });
		rowsByKey.set(key, rows);
	}

	for (const product of products) {
		const key = `${product.id}:${product.recipient.toLowerCase()}`;
		const row = rowsByKey.get(key)?.pop();

		if (!row) throw new Error("CART_CHANGED");
		if (Number(row.price_snapshot) !== Number(product.priceSnapshot ?? product.price)) {
			throw new Error("PRICE_CHANGED");
		}
	}

	if ([...rowsByKey.values()].some((rows) => rows.length > 0)) {
		throw new Error("CART_CHANGED");
	}

	const itemIds = [...new Set(products.map((product) => product.id))];
	const current = itemIds.length > 0
		? await (trx as any)
			.selectFrom("store_items")
			.select(["id", "price"])
			.where("id", "in", itemIds)
			.execute() as Array<{ id: number; price: string }>
		: [];
	const currentById = new Map(current.map((item) => [item.id, Number(item.price)]));

	for (const product of products) {
		if (currentById.get(product.id) !== Number(product.price)) {
			throw new Error("PRICE_CHANGED");
		}
	}
}

async function createGamePaymentRecord(
	trx: EconomyTrx,
	uniqueId: string,
	initiator: string,
	products: Product[],
	price: Record<string, number>,
	dedup: Map<number, DeliveryCheck>,
) {
	const game = trx as any;

	const childs = await game
		.insertInto("payments_game_childs")
		.values(products.map(({ recipient, id: store_item_id, type, value, command, refundCmd, price: itemPrice, currency }, index) => {
			const check = dedup.get(index);
			const duplicate = check?.duplicate ?? false;

			return {
				recipient,
				store_item_id,
				order_id: uniqueId,
				line: index,
				type,
				value,
				command: command ?? null,
				refund_cmd: refundCmd ?? null,
				price: itemPrice,
				currency,
				effect: check?.effect ?? null,
				command_id: randomUUID(),
				delivery_status: duplicate ? "skipped" : "pending",
				last_error: duplicate ? "PERMISSION_ALREADY_PRESENT" : null,
			};
		}))
		.returningAll()
		.execute() as GameChild[];

	await game
		.insertInto("payments_game")
		.values({ unique_id: uniqueId, initiator, price })
		.execute();

	return childs;
}

/** An idempotent retry finds the earlier order and skips the whole flow. */
export async function findGameOrder(uniqueId: string, initiator: string) {
	const row = await (general as any)
		.selectFrom("payments_game")
		.select(["unique_id", "initiator", "price"])
		.where("unique_id", "=", uniqueId)
		.where("initiator", "=", initiator)
		.executeTakeFirst();

	return row ?? null;
}

/**
 * Compensates a purchase whose delivery failed: the money goes back through
 * the ledger and the order is marked refunded. Idempotent by the rollback
 * reason, and a no-op once any refund (automatic or admin) was recorded.
 */
export async function rollbackGameOrder(orderId: string, reason: string): Promise<void> {
	const result = await economyTransaction().execute(async (trx) => {
		// One claim per order: an admin refund and this rollback must not both
		// credit the same purchase.
		const order = await (trx as any)
			.selectFrom("payments_game")
			.select(["refunded_at"])
			.where("unique_id", "=", orderId)
			.forUpdate()
			.executeTakeFirst();

		if (!order) return null;

		const entries = await (trx as any)
			.selectFrom("ledger_entries")
			.selectAll()
			.where("order_id", "=", orderId)
			.orderBy("id", "asc")
			.execute() as LedgerEntry[];

		const purchases = entries.filter((entry) => entry.reason.startsWith("store.purchase:"));

		// A delivery-time duplicate may already have refunded a single child.
		// Do not credit that amount a second time on a later full rollback.
		const partialRefunds = new Map<string, number>();
		for (const entry of entries) {
			if (!entry.reason.startsWith("store.partial_refund:")) continue;
			partialRefunds.set(
				entry.currency,
				(partialRefunds.get(entry.currency) ?? 0) + Math.abs(Number(entry.delta)),
			);
		}

		if (order.refunded_at) {
			// A retry may be the first place that sees a refund written by an
			// older build without a revoke job.
			await enqueueGrantJob(
				{ orderId, kind: "store.revoke", payload: { orderId } },
				trx,
			);

			// Re-sync a refund that committed but was not projected.
			return {
				applied: purchases.map((entry) => ({
					entry,
					balance: Number(entry.balance_after),
					duplicate: true,
				})) as ApplyResult[],
			};
		}

		await (trx as any)
			.deleteFrom("grant_jobs")
			.where("order_id", "=", orderId)
			.where("kind", "=", "store.fulfillment")
			.where("status", "in", ["pending", "failed"])
			.execute();

		const applied: ApplyResult[] = [];

		for (const entry of purchases) {
			const currency = entry.currency as GameCurrency;
			if (!GAME_CURRENCIES.includes(currency)) continue;

			const alreadyRefunded = partialRefunds.get(currency) ?? 0;
			const amount = Math.max(0, Math.abs(Number(entry.delta)) - alreadyRefunded);
			if (amount === 0) continue;

			partialRefunds.set(currency, 0);

			const credited = await credit(entry.nickname, currency, amount, {
				reason: `store.rollback:${currency}`,
				orderId,
				actor: "system",
				metadata: { reason, source: "auto-rollback" },
			}, trx);

			applied.push(credited);
		}

		await (trx as any)
			.updateTable("payments_game")
			.set({ refunded_at: new Date(), failure_reason: reason })
			.where("unique_id", "=", orderId)
			.execute();

		// A partial delivery may have delivered some items before the failure.
		// The reversal command is idempotent, so it is safe for the rest.
		await enqueueGrantJob(
			{ orderId, kind: "store.revoke", payload: { orderId } },
			trx,
		);

		return { applied };
	});

	if (result) {
		await flushProjections(result.applied);

		void processGrantJobs(10).catch((error) => {
			logErrorMsg(error, { subject: "store-rollback-trigger" });
		});
	}
}

registerGrantHandler("store.rollback", async (payload) => {
	await rollbackGameOrder(String(payload.orderId), String(payload.reason ?? "delivery failed"));
});

export async function updateGamePaymentRecord(uniqueId: string): Promise<void> {
	const [order, pending] = await Promise.all([
		(general as any)
			.selectFrom("payments_game")
			.select("refunded_at")
			.where("unique_id", "=", uniqueId)
			.executeTakeFirst(),
		(general as any)
			.selectFrom("payments_game_childs")
			.select("id")
			.where("order_id", "=", uniqueId)
			.where("delivery_status", "in", ["pending", "failed"])
			.executeTakeFirst(),
	]);

	// A refunded order stays refunded, and a partial delivery stays pending
	// until the remaining children succeed or the rollback marks them failed.
	if (order?.refunded_at || pending) return;

	await general
		.updateTable("payments_game")
		.set({ finished_at: new Date().toISOString() })
		.where("unique_id", "=", uniqueId)
		.executeTakeFirst();
}

registerGrantHandler(FULFILLMENT_KIND, async (payload) => {
	const { uniqueId, initiator, items, server } = payload as {
		uniqueId: string;
		initiator: string;
		server?: string;
		items: FulfillmentProduct[];
	};

	const childs = await loadGameChildren(uniqueId);
	// New jobs carry the child id; older jobs fall back to payload order.
	const resolved = items
		.map((item, index) => {
			const child = item.childId
				? childs.find((row) => row.id === item.childId)
				: childs[index];

			return {
				...item,
				id: item.id ?? child?.store_item_id,
				line: item.line ?? child?.line ?? undefined,
				childId: item.childId ?? child?.id,
			};
		})
		.filter((item): item is typeof item & { id: number } => typeof item.id === "number");

	await fulfill(resolved, { initiator, orderId: uniqueId, childs, server });
	await updateGamePaymentRecord(uniqueId);
});

/**
 * Reverses the delivered effect. Uses the item's `refund_cmd` snapshot; a
 * donation without one falls back to removing the LuckPerms group. Commands
 * are expected to be idempotent, because the outbox retries the job.
 */
export async function revokeGameOrder(orderId: string): Promise<void> {
	const [childs, items] = await Promise.all([
		(general as any)
			.selectFrom("payments_game_childs")
			.selectAll()
			.where("order_id", "=", orderId)
			.execute() as Promise<any[]>,
		(general as any)
			.selectFrom("store_items")
			.select(["id", "type", "value", "refund_cmd"])
			.execute() as Promise<any[]>,
	]);

	const itemMap = new Map<number, any>(items.map((item) => [item.id, item]));
	const errors: unknown[] = [];

	for (const child of childs) {
		if (child.delivery_status === "revoked" || child.delivery_status === "skipped") continue;

		const item = itemMap.get(child.store_item_id);
		const type = child.type ?? item?.type ?? "";
		const value = child.value ?? item?.value ?? "";
		const template = child.refund_cmd ?? item?.refund_cmd ?? null;

		// The default donate revocation goes straight to LuckPerms, the same way
		// the grant was written. It does not rely on the NATS command executor.
		if (!template) {
			if (type !== "donate" || !value) continue;

			try {
				await removeDonateGroup({ recipient: child.recipient, value });
				await markChildRevoked(child.id);
			} catch (error) {
				await markChildRevokeFailed(child.id, error);
				errors.push(error);
				logErrorMsg(error, { subject: "store-revoke" });
			}

			continue;
		}

		try {
			await runCommandLine(renderCommand(template, {
				recipient: child.recipient,
				value,
				initiator: "",
				order_id: orderId,
				item_id: String(child.store_item_id),
			}), {
				commandId: `${child.command_id ?? randomUUID()}:revoke`,
				orderId,
				childId: child.id,
				kind: "revoke",
				recipient: child.recipient,
				fallbackServer: "bisquite",
			});

			await markChildRevoked(child.id);
		} catch (error) {
			await markChildRevokeFailed(child.id, error);
			errors.push(error);
			logErrorMsg(error, { subject: "store-revoke" });
		}
	}

	if (errors.length > 0) throw new Error("STORE_REVOKE_FAILED");
}

registerGrantHandler("store.revoke", async (payload) => {
	await revokeGameOrder(String(payload.orderId));
});

/**
 * Safety net for the checkout window: if the process died after the purchase
 * transaction but before the fulfillment job was written, the order is paid and
 * pending. Rebuild the delivery payload from the child snapshots and enqueue it.
 * Only ledger-backed orders are picked up, so the pre-ledger test rows are not
 * delivered.
 */
export async function repairPendingGameOrders(limit = 20): Promise<{
	scanned: number;
	enqueued: number;
}> {
	const db = general as any;

	const orders = await db
		.selectFrom("payments_game as pg")
		.select(["pg.unique_id", "pg.initiator"])
		.where("pg.finished_at", "is", null)
		.where("pg.refunded_at", "is", null)
		.where((eb: any) => eb.exists(
			eb.selectFrom("ledger_entries as le")
				.select("le.id")
				.whereRef("le.order_id", "=", "pg.unique_id")
				.where("le.reason", "like", "store.purchase:%"),
		))
		.where((eb: any) => eb.not(
			eb.exists(
				eb.selectFrom("grant_jobs as gj")
					.select("gj.id")
					.whereRef("gj.order_id", "=", "pg.unique_id")
					.where("gj.kind", "in", [FULFILLMENT_KIND, "store.rollback", "store.revoke"]),
			),
		))
		.orderBy("pg.created_at", "asc")
		.limit(limit)
		.execute() as Array<{ unique_id: string; initiator: string }>;

	let enqueued = 0;

	for (const order of orders) {
		const childs = await db
			.selectFrom("payments_game_childs")
			.selectAll()
			.where("order_id", "=", order.unique_id)
			.execute() as Array<{
				id: number;
				store_item_id: number;
				recipient: string;
				line: number | null;
				type: string | null;
				value: string | null;
				command: string | null;
			}>;

		const itemIds = [...new Set(childs.map((child) => child.store_item_id))];
		const items = itemIds.length > 0
			? await db
				.selectFrom("store_items")
				.select(["id", "type", "value", "command"])
				.where("id", "in", itemIds)
				.execute() as Array<{
					id: number;
					type: string;
					value: string;
					command: string | null;
				}>
			: [];

		const itemMap = new Map(items.map((item) => [item.id, item]));
		const products = childs.flatMap((child) => {
			const item = itemMap.get(child.store_item_id);
			const type = child.type ?? item?.type ?? "";
			const value = child.value ?? item?.value ?? "";
			const command = child.command ?? item?.command ?? null;

			// Either an explicit command or a known built-in type is required.
			if (!command && (!type || !value)) return [];

			return [{
				id: child.store_item_id,
				recipient: child.recipient,
				type,
				value,
				command,
				childId: child.id,
				line: child.line ?? undefined,
			}];
		});

		if (products.length === 0) {
			logErrorMsg(
				new Error(`STORE_REPAIR_NO_ITEMS:${order.unique_id}`),
				{ subject: "store-repair" },
			);
			continue;
		}

		const purchase = await db
			.selectFrom("ledger_entries")
			.select("metadata")
			.where("order_id", "=", order.unique_id)
			.where("reason", "like", "store.purchase:%")
			.executeTakeFirst() as { metadata?: { server?: string } } | undefined;

		await enqueueGrantJob({
			orderId: order.unique_id,
			kind: FULFILLMENT_KIND,
			payload: {
				uniqueId: order.unique_id,
				initiator: order.initiator,
				server: purchase?.metadata?.server ?? "bisquite",
				items: products,
			},
		});

		enqueued += 1;
	}

	return { scanned: orders.length, enqueued };
}

/**
 * Takes the money and writes the order in one transaction, then runs the
 * non-money effects. The money never depends on a server command: the plugins
 * read the projection of the wallet, which is retried through `grant_jobs`.
 */
export async function processStoreGamePurchase({
	initiator,
	uniqueId,
	products,
	finishPrice,
	server,
	dedup,
}: {
	initiator: string;
	uniqueId: string;
	products: Product[];
	finishPrice: Record<GameCurrency, number>;
	server: string;
	dedup: Map<number, DeliveryCheck>;
}): Promise<{ error: string | null }> {
	let applied: ApplyResult[];

	const deliverable = products
		.map((product, index) => ({ product, index }))
		.filter(({ index }) => !dedup.get(index)?.duplicate);

	if (deliverable.length === 0) return { error: "ITEMS_ALREADY_OWNED" };

	try {
		const transaction = await economyTransaction().execute(async (trx) => {
			await lockAndValidateCart(trx, initiator, products);

			const childs = await createGamePaymentRecord(
				trx,
				uniqueId,
				initiator,
				products,
				finishPrice,
				dedup,
			);
			const childByLine = new Map(childs.map((child) => [child.line, child]));

			const results: ApplyResult[] = [];

			for (const currency of GAME_CURRENCIES) {
				const amount = Number(finishPrice[currency] ?? 0);
				if (amount <= 0) continue;

				results.push(await debit(initiator, currency, amount, {
					reason: `store.purchase:${currency}`,
					orderId: uniqueId,
					metadata: { server },
				}, trx));
			}

			// The selected cart rows are consumed by this order; a failed debit
			// rolls the delete back with the rest of the transaction.
			await trx
				.deleteFrom("store_cart_items")
				.where("initiator", "=", initiator)
				.where("selected", "=", true)
				.execute();

			// The job is part of the purchase transaction: a process death after
			// the commit cannot leave a paid order without a delivery path.
			await enqueueGrantJob({
				orderId: uniqueId,
				kind: FULFILLMENT_KIND,
				payload: {
					uniqueId,
					initiator,
					server,
					items: deliverable.map(({ product, index }) => {
						const child = childByLine.get(index);

						return {
							id: product.id,
							recipient: product.recipient,
							type: product.type,
							value: product.value,
							command: product.command,
							childId: child?.id,
							line: index,
						};
					}),
				},
			}, trx);

			return { applied: results };
		});

		applied = transaction.applied;
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";

		if (message === "INSUFFICIENT_FUNDS") {
			return { error: "insufficient" };
		}

		logErrorMsg(error, { subject: "store-purchase" });
		return { error: message };
	}

	await flushProjections(applied);

	// Deliver in the background; the job is durable even if this trigger dies.
	// A larger batch makes sure an older failed projection cannot consume the
	// only slot and leave the new order waiting for the next cron tick.
	void processGrantJobs(10).catch((error) => {
		logErrorMsg(error, { subject: "store-fulfillment-trigger" });
	});

	return { error: null };
}
