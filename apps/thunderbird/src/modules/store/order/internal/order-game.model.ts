import { general } from "#/shared/database/general-db";
import { logErrorMsg } from "#/utils/config/log-utils";
import { processDonatePayment } from "#/utils/payment/process-donate-payment";
import { callServerCommand } from "#/utils/server/call-command";
import { GAME_CURRENCIES, type GameCurrency } from "@repo/shared/schemas/store/payment";
import {
	credit,
	debit,
	economyTransaction,
	getOrderEntries,
	flushProjections,
	type ApplyResult,
	type EconomyTrx,
} from "#/modules/economy/wallet.model";
import { enqueueGrantJob, registerGrantHandler } from "#/modules/economy/grant-jobs.model";

export const initialPrices: Record<string, number> = Object
	.fromEntries(GAME_CURRENCIES.map((currency) => [currency, 0]));

type Product = {
	recipient: string;
	id: number;
	price: string;
	type: string;
	value: string;
	currency: string;
	title: string;
	command?: string | null;
	refundCmd?: string | null;
};

/** Outbox kind for the non-money part of an order (groups, toasts, items). */
const FULFILLMENT_KIND = "store.fulfillment";

function createTasksForItem({ recipient, type, value }: Pick<Product, "recipient" | "type" | "value">) {
	const tasks: Array<() => Promise<unknown>> = [];

	if (type === "donate") {
		for (const task of processDonatePayment({ recipient, type: "donate", value })) {
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
		tasks.push(() => callServerCommand({ parent: "cmi", value: `toast ${recipient} Поздравляем с покупкой!` }));
	}

	return tasks;
}

function renderCommand(template: string, vars: Record<string, string>): string {
	return template.replace(/\{(recipient|value|initiator|order_id|item_id)\}/g, (_, key: string) => vars[key] ?? "");
}

/** A command template is a full console command: `lp user {recipient} ...`. */
async function runCommandLine(line: string): Promise<void> {
	const [parent, ...rest] = line.trim().split(/\s+/);
	const value = rest.join(" ");

	if (!parent || !value) throw new Error("EMPTY_REFUND_COMMAND");

	await callServerCommand({ parent: parent as never, value });
}

async function fulfill(
	products: Pick<Product, "recipient" | "type" | "value" | "command">[],
	{ initiator, orderId }: { initiator: string; orderId: string },
): Promise<void> {
	for (const product of products) {
		// An explicit command is the delivery: it replaces the built-in
		// type-specific behaviour and keeps other module integrations possible.
		if (product.command) {
			await runCommandLine(renderCommand(product.command, {
				recipient: product.recipient,
				value: product.value,
				initiator,
				order_id: orderId,
			}));
			continue;
		}

		for (const task of createTasksForItem(product)) {
			await task();
		}
	}
}

async function createGamePaymentRecord(
	trx: EconomyTrx,
	uniqueId: string,
	initiator: string,
	products: Product[],
	price: Record<string, number>,
) {
	const game = trx as any;

	await game
		.insertInto("payments_game_childs")
		.values(products.map(({ recipient, id: store_item_id, type, value, command, refundCmd }) => ({
			recipient,
			store_item_id,
			order_id: uniqueId,
			type,
			value,
			command: command ?? null,
			refund_cmd: refundCmd ?? null,
		})))
		.execute();

	await game
		.insertInto("payments_game")
		.values({ unique_id: uniqueId, initiator, price })
		.execute();
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
	const order = await (general as any)
		.selectFrom("payments_game")
		.select(["refunded_at"])
		.where("unique_id", "=", orderId)
		.executeTakeFirst();

	if (!order || order.refunded_at) return;

	await (general as any)
		.deleteFrom("grant_jobs")
		.where("order_id", "=", orderId)
		.where("kind", "=", "store.fulfillment")
		.where("status", "in", ["pending", "failed"])
		.execute();

	const entries = await getOrderEntries(orderId);

	for (const entry of entries) {
		if (!entry.reason.startsWith("store.purchase:")) continue;

		const currency = entry.currency as GameCurrency;
		if (!GAME_CURRENCIES.includes(currency)) continue;

		await credit(entry.nickname, currency, Math.abs(Number(entry.delta)), {
			reason: `store.rollback:${currency}`,
			orderId,
			actor: "system",
			metadata: { reason, source: "auto-rollback" },
		});
	}

	await (general as any)
		.updateTable("payments_game")
		.set({ refunded_at: new Date(), failure_reason: reason })
		.where("unique_id", "=", orderId)
		.execute();
}

registerGrantHandler("store.rollback", async (payload) => {
	await rollbackGameOrder(String(payload.orderId), String(payload.reason ?? "delivery failed"));
});

export async function updateGamePaymentRecord(uniqueId: string) {
	return general
		.updateTable("payments_game")
		.set({ finished_at: new Date().toISOString() })
		.where("unique_id", "=", uniqueId)
		.executeTakeFirstOrThrow();
}

registerGrantHandler(FULFILLMENT_KIND, async (payload) => {
	const { uniqueId, initiator, items } = payload as {
		uniqueId: string;
		initiator: string;
		items: Pick<Product, "recipient" | "type" | "value" | "command">[];
	};

	await fulfill(items, { initiator, orderId: uniqueId });
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
		const item = itemMap.get(child.store_item_id);
		const type = child.type ?? item?.type ?? "";
		const value = child.value ?? item?.value ?? "";
		const template = child.refund_cmd
			?? item?.refund_cmd
			?? (type === "donate" ? "lp user {recipient} parent remove {value}" : null);

		if (!template) continue;

		try {
			await runCommandLine(renderCommand(template, {
				recipient: child.recipient,
				value,
				initiator: "",
				order_id: orderId,
				item_id: String(child.store_item_id),
			}));
		} catch (error) {
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
}: {
	initiator: string;
	uniqueId: string;
	products: Product[];
	finishPrice: Record<GameCurrency, number>;
	server: string;
}): Promise<{ error: string | null }> {
	let applied: ApplyResult[];

	try {
		applied = await economyTransaction().execute(async (trx) => {
			await createGamePaymentRecord(trx, uniqueId, initiator, products, finishPrice);

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

			return results;
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";

		if (message === "INSUFFICIENT_FUNDS") {
			return { error: "insufficient" };
		}

		logErrorMsg(error, { subject: "store-purchase" });
		return { error: message };
	}

	await flushProjections(applied);

	try {
		await fulfill(products, { initiator, orderId: uniqueId });
		await updateGamePaymentRecord(uniqueId);
	} catch (error) {
		// The player has paid; retry the delivery instead of rolling the money
		// back. The outbox keeps the payload serializable.
		logErrorMsg(error, { subject: "store-fulfillment" });

		await enqueueGrantJob({
			orderId: uniqueId,
			kind: FULFILLMENT_KIND,
			payload: {
				uniqueId,
				initiator,
				items: products.map(({ recipient, type, value, command }) => ({ recipient, type, value, command })),
			},
		});
	}

	return { error: null };
}
