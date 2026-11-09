import { randomUUID } from "node:crypto";
import { general } from "#/shared/database/general-db";
import { playerpoints } from "#/shared/database/playerpoints-db";
import { bisquite } from "#/shared/database/bisquite-db";
import { logErrorMsg } from "#/utils/config/log-utils";
import { withRedisLock } from "#/shared/redis/lock";
import type { DB, JsonObject, LedgerEntries, WalletLots } from "@gen/db/general";
import { sql, type Selectable, type Transaction } from "kysely";
import { enqueueGrantJob, registerGrantHandler } from "./grant-jobs.model";
import { isRefundReason, lotKindFor, planLotConsumption, type LotId } from "./lots";

export const CURRENCIES = ["BELKOIN", "CHARISM"] as const;
export type Currency = typeof CURRENCIES[number];

export function isCurrency(value: string): value is Currency {
	return (CURRENCIES as readonly string[]).includes(value);
}

export type EconomyTrx = Transaction<DB>;

type LedgerRow = Selectable<LedgerEntries>;

/** Economy-aware transaction; every money change must run inside one. */
export function economyTransaction() {
	return general.transaction();
}

export type LedgerEntry = LedgerRow;
export type ApplyResult = { balance: number; entry: LedgerRow; duplicate: boolean };

type ApplyInput = {
	nickname: string;
	currency: Currency;
	delta: number;
	reason: string;
	orderId?: string | null;
	actor?: string | null;
	metadata?: JsonObject;
};

function isUniqueViolation(error: unknown): boolean {
	return typeof error === "object" && error !== null && (error as { code?: string }).code === "23505";
}

/**
 * Wallets are integer units. CMI stores `Balance` as a double and float math
 * leaves values like `2.400000000000004`, so every plugin read is rounded.
 */
function toWhole(value: number): number {
	return Math.round(value);
}

async function pluginBalance(nickname: string, currency: Currency): Promise<number> {
	if (currency === "BELKOIN") {
		const row = await playerpoints
			.selectFrom("playerpoints_points")
			.innerJoin("playerpoints_username_cache", "playerpoints_username_cache.uuid", "playerpoints_points.uuid")
			.select("playerpoints_points.points as balance")
			.where("playerpoints_username_cache.username", "=", nickname)
			.executeTakeFirst();

		return toWhole(Number(row?.balance ?? 0));
	}

	const row = await bisquite
		.selectFrom("cmi_users")
		.select("Balance as balance")
		.where("username", "=", nickname)
		.executeTakeFirst();

	return toWhole(Number(row?.balance ?? 0));
}

/**
 * The wallet is the source of truth once it exists. Players who have not been
 * migrated yet fall back to the plugin table, so a deploy does not hide their
 * balance before the one-off migration runs.
 */
export async function getBalance(nickname: string, currency: Currency): Promise<number> {
	const wallet = await general
		.selectFrom("wallets")
		.select("balance")
		.where("nickname", "=", nickname)
		.where("currency", "=", currency)
		.executeTakeFirst();

	if (wallet) return Number(wallet.balance);

	return pluginBalance(nickname, currency);
}

export async function getWallet(nickname: string): Promise<Record<Currency, number>> {
	const [BELKOIN, CHARISM] = await Promise.all([
		getBalance(nickname, "BELKOIN"),
		getBalance(nickname, "CHARISM"),
	]);

	return { BELKOIN, CHARISM };
}

/**
 * Seeds a missing wallet from the plugin balance. The opening entry keeps the
 * history provable: the ledger sums to the balance from the first row.
 */
async function seedWallet(trx: EconomyTrx, nickname: string, currency: Currency): Promise<void> {
	const opening = await pluginBalance(nickname, currency);

	await trx
		.insertInto("wallets")
		.values({ nickname, currency, balance: opening })
		.onConflict((oc) => oc.columns(["nickname", "currency"]).doNothing())
		.execute();

	if (opening === 0) return;

	await trx
		.insertInto("ledger_entries")
		.values({
			nickname,
			currency,
			delta: opening,
			balance_after: opening,
			reason: "migration",
			order_id: `migration:${nickname}:${currency}`,
			actor: "system",
			metadata: { source: "plugin" },
		})
		.onConflict((oc) => oc.doNothing())
		.execute();
}

type LotRow = Selectable<WalletLots>;

/**
 * Keeps the invariant `sum(lots.remaining) == wallets.balance` before a change.
 * Balances created before lot tracking (or edited by hand) get one legacy lot
 * for the uncovered part; legacy money is deliberately not refundable.
 */
async function ensureLots(
	trx: EconomyTrx,
	nickname: string,
	currency: Currency,
	balance: number,
): Promise<void> {
	const coveredRow = await trx
		.selectFrom("wallet_lots")
		.select(sql<string>`coalesce(sum("remaining"), 0)`.as("covered"))
		.where("nickname", "=", nickname)
		.where("currency", "=", currency)
		.executeTakeFirst();

	const covered = Number(coveredRow?.covered ?? 0);
	if (covered > balance) throw new Error("LOT_IMBALANCE");
	if (covered === balance) return;

	const difference = balance - covered;

	await trx
		.insertInto("wallet_lots")
		.values({
			nickname,
			currency,
			kind: "legacy",
			refundable: false,
			amount: difference,
			remaining: difference,
			source_order_id: `legacy:${nickname}:${currency}`,
		})
		.execute();
}

async function consumeLot(
	trx: EconomyTrx,
	entry: LedgerRow,
	lot: LotRow,
	amount: number,
): Promise<void> {
	await trx
		.updateTable("wallet_lots")
		.set({
			remaining: sql`"remaining" - ${amount}`,
			updated_at: new Date(),
		})
		.where("id", "=", lot.id)
		.execute();

	await trx
		.insertInto("lot_allocations")
		.values({
			lot_id: lot.id,
			ledger_entry_id: entry.id,
			amount,
			direction: "consume",
		})
		.execute();
}

/**
 * A refund of a purchase restores the exact lots that paid for it. Restores
 * happen newest allocation first, so a partial refund undoes the last spend.
 */
async function restoreLots(
	trx: EconomyTrx,
	entry: LedgerRow,
	nickname: string,
	currency: Currency,
	amount: number,
	orderId: string | null,
): Promise<void> {
	let left = amount;

	if (orderId) {
		const allocations = await trx
			.selectFrom("lot_allocations as la")
			.select([
				"la.id",
				"la.lot_id",
				"la.amount",
				"la.restored_amount",
			])
			.where("la.direction", "=", "consume")
			.where(
				"la.ledger_entry_id",
				"in",
				trx.selectFrom("ledger_entries")
					.select("id")
					.where("order_id", "=", orderId)
					.where("currency", "=", currency)
					.where("reason", "like", "store.purchase:%"),
			)
			.orderBy("la.id", "desc")
			.forUpdate()
			.execute();

		for (const allocation of allocations) {
			if (left <= 0) break;

			const available = Number(allocation.amount) - Number(allocation.restored_amount ?? 0);
			if (available <= 0) continue;

			const restore = Math.min(available, left);

			await trx
				.updateTable("wallet_lots")
				.set({
					remaining: sql`"remaining" + ${restore}`,
					updated_at: new Date(),
				})
				.where("id", "=", allocation.lot_id)
				.execute();

			await trx
				.updateTable("lot_allocations")
				.set({ restored_amount: sql`"restored_amount" + ${restore}` })
				.where("id", "=", allocation.id)
				.execute();

			await trx
				.insertInto("lot_allocations")
				.values({
					lot_id: allocation.lot_id,
					ledger_entry_id: entry.id,
					amount: restore,
					direction: "restore",
				})
				.execute();

			left -= restore;
		}
	}

	// The original spend predates lot tracking, or the refund is larger than
	// the original allocations. Keep the balance covered, but non-refundable.
	if (left > 0) {
		await trx
			.insertInto("wallet_lots")
			.values({
				nickname,
				currency,
				kind: "legacy",
				refundable: false,
				amount: left,
				remaining: left,
				source_ledger_id: entry.id,
			})
			.execute();
	}
}

async function creditLot(
	trx: EconomyTrx,
	entry: LedgerRow,
	nickname: string,
	currency: Currency,
	amount: number,
	reason: string,
	orderId: string | null,
): Promise<void> {
	if (isRefundReason(reason)) {
		await restoreLots(trx, entry, nickname, currency, amount, orderId);
		return;
	}

	const { kind, refundable } = lotKindFor(reason);

	await trx
		.insertInto("wallet_lots")
		.values({
			nickname,
			currency,
			kind,
			refundable,
			amount,
			remaining: amount,
			source_order_id: kind === "topup" ? orderId : null,
			source_ledger_id: entry.id,
		})
		.execute();
}

async function debitLots(
	trx: EconomyTrx,
	entry: LedgerRow,
	nickname: string,
	currency: Currency,
	amount: number,
	metadata: JsonObject,
): Promise<void> {
	let left = amount;
	const explicitLotId = Number(metadata.lotId);

	// A top-up refund must consume its own lot, never another wallet source.
	if (Number.isInteger(explicitLotId) && explicitLotId > 0) {
		const lot = await trx
			.selectFrom("wallet_lots")
			.selectAll()
			.where("id", "=", String(explicitLotId))
			.forUpdate()
			.executeTakeFirst();

		if (!lot) throw new Error("LOT_NOT_FOUND");
		if (Number(lot.remaining) < left) throw new Error("LOT_INSUFFICIENT");

		await consumeLot(trx, entry, lot, left);
		return;
	}

	// Top-up lots are spent first (FIFO), then rewards and adjustments. This
	// keeps the refundable remainder aligned with what the player actually paid.
	const lots = await trx
		.selectFrom("wallet_lots")
		.selectAll()
		.where("nickname", "=", nickname)
		.where("currency", "=", currency)
		.where("remaining", ">", "0")
		.orderBy(sql`case when "kind" = 'topup' then 0 else 1 end`, "asc")
		.orderBy("created_at", "asc")
		.orderBy("id", "asc")
		.forUpdate()
		.execute();

	const plan = planLotConsumption(lots, left);
	const byId = new Map<LotId, LotRow>(lots.map((lot) => [lot.id, lot]));

	for (const allocation of plan.allocations) {
		const lot = byId.get(allocation.lotId);
		if (!lot) continue;

		await consumeLot(trx, entry, lot, allocation.amount);
	}

	if (plan.remaining > 0) throw new Error("LOT_COVERAGE_MISSING");
}

/**
 * Refunds only the unspent part of a top-up. The fiat/provider refund is a
 * separate concern; this function moves BELKOIN and returns the actual amount.
 */
export async function refundTopup({
	orderId,
	actor,
	adminReason,
}: {
	orderId: string;
	actor: string;
	adminReason: string;
}): Promise<{ applied: ApplyResult; amount: number } | null> {
	return economyTransaction().execute(async (trx) => {
		const existing = await trx
			.selectFrom("ledger_entries")
			.selectAll()
			.where("order_id", "=", orderId)
			.where("reason", "=", "payment.refund:BELKOIN")
			.executeTakeFirst();

		if (existing) {
			return {
				applied: {
					balance: Number(existing.balance_after),
					entry: existing,
					duplicate: true,
				},
				amount: Math.abs(Number(existing.delta)),
			};
		}

		const preview = await trx
			.selectFrom("wallet_lots")
			.selectAll()
			.where("source_order_id", "=", orderId)
			.where("kind", "=", "topup")
			.executeTakeFirst();

		if (!preview) return null;

		// Same lock order as every money change: wallet first, then lots. The
		// preview only tells us which wallet to lock.
		await trx
			.selectFrom("wallets")
			.select("nickname")
			.where("nickname", "=", preview.nickname)
			.where("currency", "=", preview.currency)
			.forUpdate()
			.executeTakeFirst();

		const lot = await trx
			.selectFrom("wallet_lots")
			.selectAll()
			.where("id", "=", String(preview.id))
			.forUpdate()
			.executeTakeFirst();

		if (!lot) return null;

		const amount = Number(lot.remaining);
		if (amount <= 0) return null;
		if (!isCurrency(lot.currency)) return null;

		const applied = await applyInTransaction(trx, {
			nickname: lot.nickname,
			currency: lot.currency,
			delta: -amount,
			reason: "payment.refund:BELKOIN",
			orderId,
			actor,
			metadata: { adminReason, lotId: lot.id, source: "payment.refund" },
		});

		return { applied, amount };
	});
}

/**
 * Reconciles a wallet whose lot sum is below the balance. Cannot fix an
 * overcovered wallet: that would mean lots exceed real money.
 */
export async function repairWalletLots(nickname: string, currency: Currency): Promise<number | null> {
	return economyTransaction().execute(async (trx) => {
		const wallet = await trx
			.selectFrom("wallets")
			.select("balance")
			.where("nickname", "=", nickname)
			.where("currency", "=", currency)
			.forUpdate()
			.executeTakeFirst();

		if (!wallet) return null;

		const balance = Number(wallet.balance);
		await ensureLots(trx, nickname, currency, balance);

		return balance;
	});
}

export async function getRefundable(nickname: string, currency: Currency): Promise<number> {
	const row = await general
		.selectFrom("wallet_lots")
		.select(sql<string>`coalesce(sum("remaining"), 0)`.as("amount"))
		.where("nickname", "=", nickname)
		.where("currency", "=", currency)
		.where("refundable", "=", true)
		.executeTakeFirst();

	return Number(row?.amount ?? 0);
}

/**
 * Applies one signed change to a wallet and records it in the ledger.
 *
 * The wallet row is locked while the balance is read, so two concurrent
 * purchases cannot both see the old balance. `(order_id, reason)` makes the
 * business operation idempotent: a retry returns the first entry instead of
 * moving money twice.
 *
 * When a caller already owns a transaction (a purchase writes the order and
 * the debit together), it passes `trx` and calls `flushProjections` after the
 * commit instead of relying on side effects inside the transaction.
 */
async function applyInTransaction(trx: EconomyTrx, input: ApplyInput): Promise<ApplyResult> {
	const { nickname, currency, delta, reason, orderId = null, actor = null, metadata = {} } = input;

	if (delta === 0) {
		throw new Error("ZERO_DELTA");
	}

	if (orderId) {
		const existing = await trx
			.selectFrom("ledger_entries")
			.selectAll()
			.where("order_id", "=", orderId)
			.where("reason", "=", reason)
			.executeTakeFirst();

		if (existing) return { balance: Number(existing.balance_after), entry: existing, duplicate: true };
	}

	const walletExists = await trx
		.selectFrom("wallets")
		.select("nickname")
		.where("nickname", "=", nickname)
		.where("currency", "=", currency)
		.executeTakeFirst();

	// First write for this player: adopt the plugin balance before applying the
	// delta, otherwise the projection would overwrite it with a fraction.
	if (!walletExists) await seedWallet(trx, nickname, currency);

	const wallet = await trx
		.selectFrom("wallets")
		.select("balance")
		.where("nickname", "=", nickname)
		.where("currency", "=", currency)
		.forUpdate()
		.executeTakeFirstOrThrow();

	const currentBalance = Number(wallet.balance);
	await ensureLots(trx, nickname, currency, currentBalance);

	const balance = currentBalance + delta;
	if (balance < 0) throw new Error("INSUFFICIENT_FUNDS");

	await trx
		.updateTable("wallets")
		.set({ balance, updated_at: new Date() })
		.where("nickname", "=", nickname)
		.where("currency", "=", currency)
		.execute();

	const entry = await trx
		.insertInto("ledger_entries")
		.values({
			nickname,
			currency,
			delta,
			balance_after: balance,
			reason,
			order_id: orderId,
			actor,
			metadata,
		})
		.returningAll()
		.executeTakeFirstOrThrow();

	if (delta > 0) {
		await creditLot(trx, entry, nickname, currency, delta, reason, orderId);
	} else {
		await debitLots(trx, entry, nickname, currency, Math.abs(delta), metadata);
	}

	return { balance, entry, duplicate: false };
}

async function apply(input: ApplyInput): Promise<ApplyResult> {
	const { nickname, currency, reason, orderId = null } = input;

	try {
		const result = await economyTransaction().execute((trx) => applyInTransaction(trx, input));

		// A duplicate can mean the first process died before projecting; always
		// re-sync, because the projection handler reads the current wallet anyway.
		await syncOrEnqueue(result.entry);

		return { balance: Number(result.entry.balance_after), entry: result.entry, duplicate: result.duplicate };
	} catch (error) {
		// Two concurrent retries of the same operation: one wins the unique index,
		// the other reads the winning row.
		if (orderId && isUniqueViolation(error)) {
			const existing = await general
				.selectFrom("ledger_entries")
				.selectAll()
				.where("order_id", "=", orderId)
				.where("reason", "=", reason)
				.executeTakeFirst();

			if (existing) {
				await syncOrEnqueue(existing);
				return { balance: Number(existing.balance_after), entry: existing, duplicate: true };
			}
		}

		throw error;
	}
}

export function credit(
	nickname: string,
	currency: Currency,
	amount: number,
	options: Omit<ApplyInput, "nickname" | "currency" | "delta">,
	trx?: EconomyTrx,
): Promise<ApplyResult> {
	const input: ApplyInput = { ...options, nickname, currency, delta: Math.abs(amount) };

	return trx ? applyInTransaction(trx, input) : apply(input);
}

export function debit(
	nickname: string,
	currency: Currency,
	amount: number,
	options: Omit<ApplyInput, "nickname" | "currency" | "delta">,
	trx?: EconomyTrx,
): Promise<ApplyResult> {
	const input: ApplyInput = { ...options, nickname, currency, delta: -Math.abs(amount) };

	return trx ? applyInTransaction(trx, input) : apply(input);
}

export type RefundedPurchase = {
	currency: Currency;
	amount: number;
	balance: number;
	duplicate: boolean;
};

export type RefundPurchasesResult = {
	applied: ApplyResult[];
	refunded: RefundedPurchase[];
};

/**
 * Reverses every purchase entry of one order through the ledger. Shared by the
 * admin refund and the automatic rollback so both keep the same rules: a child
 * refunded at delivery time is not credited twice, and only game currencies
 * are touched.
 */
export async function refundPurchasesInTransaction(
	trx: EconomyTrx,
	{
		orderId,
		reasonPrefix,
		actor,
		metadata,
		resync = false,
	}: {
		orderId: string;
		reasonPrefix: "store.refund" | "store.rollback";
		actor: string | null;
		metadata?: (entry: LedgerEntry) => JsonObject;
		resync?: boolean;
	},
): Promise<RefundPurchasesResult> {
	const entries = await trx
		.selectFrom("ledger_entries")
		.selectAll()
		.where("order_id", "=", orderId)
		.orderBy("id", "asc")
		.execute();

	const purchases = entries.filter((entry) => entry.reason.startsWith("store.purchase:"));

	if (resync) {
		return {
			applied: purchases.map((entry) => ({
				entry,
				balance: Number(entry.balance_after),
				duplicate: true,
			})),
			refunded: [],
		};
	}

	// A delivery-time duplicate may already have refunded a single child.
	// Do not credit that amount a second time on a later full refund.
	const partialRefunds = new Map<string, number>();

	for (const entry of entries) {
		if (!entry.reason.startsWith("store.partial_refund:")) continue;

		partialRefunds.set(
			entry.currency,
			(partialRefunds.get(entry.currency) ?? 0) + Math.abs(Number(entry.delta)),
		);
	}

	const applied: ApplyResult[] = [];
	const refunded: RefundedPurchase[] = [];

	for (const entry of purchases) {
		if (!isCurrency(entry.currency)) continue;

		const currency = entry.currency;
		const alreadyRefunded = partialRefunds.get(currency) ?? 0;
		const amount = Math.max(0, Math.abs(Number(entry.delta)) - alreadyRefunded);
		if (amount === 0) continue;

		partialRefunds.set(currency, 0);

		const credited = await credit(entry.nickname, currency, amount, {
			reason: `${reasonPrefix}:${currency}`,
			orderId,
			actor,
			metadata: metadata?.(entry) ?? {},
		}, trx);

		applied.push(credited);
		refunded.push({
			currency,
			amount,
			balance: credited.balance,
			duplicate: credited.duplicate,
		});
	}

	return { applied, refunded };
}

/**
 * Projections are serialized per wallet inside this process. The handler reads
 * the current wallet row, so a job that was enqueued long ago cannot overwrite
 * a newer balance with its old payload.
 */
const projectionLocks = new Map<string, Promise<void>>();

async function withProjectionLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
	const previous = projectionLocks.get(key) ?? Promise.resolve();
	let release!: () => void;
	const current = new Promise<void>((resolve) => {
		release = resolve;
	});
	const queued = previous.then(() => current);

	projectionLocks.set(key, queued);
	await previous;

	try {
		// The in-process queue still batches callers; the Redis lock serializes
		// the actual plugin write across API replicas.
		return await withRedisLock(
			`wallet:projection:${key}`,
			15_000,
			fn,
			{ waitMs: 5_000 },
		);
	} finally {
		release();

		if (projectionLocks.get(key) === queued) projectionLocks.delete(key);
	}
}

async function currentWalletBalance(nickname: string, currency: Currency): Promise<number> {
	const wallet = await general
		.selectFrom("wallets")
		.select("balance")
		.where("nickname", "=", nickname)
		.where("currency", "=", currency)
		.executeTakeFirst();

	if (!wallet) throw new Error("WALLET_NOT_FOUND");

	return Number(wallet.balance);
}

/** Writes the current wallet balance to the plugin table the servers read. */
async function syncProjection(nickname: string, currency: Currency): Promise<void> {
	await withProjectionLock(`${nickname}:${currency}`, async () => {
		const balance = await currentWalletBalance(nickname, currency);

		if (currency === "BELKOIN") {
			const account = await general
				.selectFrom("accounts")
				.select("uuid")
				.where("lower_nickname", "=", nickname.toLowerCase())
				.executeTakeFirst();

			// Legacy players exist only in PlayerPoints: its own uuid cache is the
			// fallback so their balance keeps working after the ledger takes over.
			const cached = account
				? null
				: await playerpoints
					.selectFrom("playerpoints_username_cache")
					.select("uuid")
					.where("username", "=", nickname)
					.executeTakeFirst();

			const uuid = account?.uuid ?? cached?.uuid;
			if (!uuid) throw new Error("ACCOUNT_NOT_FOUND");

			await playerpoints
				.insertInto("playerpoints_points")
				.values({ uuid, points: balance })
				.onDuplicateKeyUpdate({ points: balance })
				.execute();
		} else {
			const updated = await bisquite
				.updateTable("cmi_users")
				.set({ Balance: balance })
				.where("username", "=", nickname)
				.executeTakeFirst();

			// CMI creates its row on the first join; until then the ledger keeps the
			// balance and the outbox retries the projection.
			if (Number(updated.numUpdatedRows ?? 0) === 0) throw new Error("CMI_PLAYER_NOT_FOUND");
		}
	});
}

async function syncOrEnqueue(entry: LedgerRow): Promise<void> {
	const nickname = entry.nickname;

	if (!isCurrency(entry.currency)) {
		logErrorMsg(new Error(`UNKNOWN_CURRENCY:${entry.currency}`), { subject: "wallet-projection" });
		return;
	}

	const currency = entry.currency;

	try {
		await syncProjection(nickname, currency);
	} catch (error) {
		logErrorMsg(error, { subject: "wallet-projection" });

		// A fresh id per failed attempt: a previously done job must not swallow
		// this one, and every projection reads the current balance anyway.
		await enqueueGrantJob({
			orderId: `projection:${entry.id}:${randomUUID()}`,
			kind: currency,
			payload: { nickname, currency },
		});
	}
}

/** Runs after a money transaction commits; duplicates are re-synced too. */
export async function flushProjections(results: ApplyResult[]): Promise<void> {
	for (const result of results) {
		await syncOrEnqueue(result.entry);
	}
}

for (const currency of CURRENCIES) {
	registerGrantHandler(currency, async (payload) => {
		await syncProjection(String(payload.nickname), currency);
	});
}

/**
 * One-off migration: copies the plugin balance into a wallet and records an
 * opening ledger entry. Idempotent through `migration:<nickname>:<currency>`
 * and a no-op once the wallet exists (first write seeds it automatically).
 */
async function migrateWallet(
	nickname: string,
	currency: Currency,
): Promise<{ balance: number } | null> {
	return economyTransaction().execute(async (trx) => {
		const existing = await trx
			.selectFrom("wallets")
			.select("balance")
			.where("nickname", "=", nickname)
			.where("currency", "=", currency)
			.executeTakeFirst();

		if (existing) return null;

		// The seed writes the wallet and the opening ledger entry together, so
		// the ledger sums to the balance from the first row.
		await seedWallet(trx, nickname, currency);

		const created = await trx
			.selectFrom("wallets")
			.select("balance")
			.where("nickname", "=", nickname)
			.where("currency", "=", currency)
			.executeTakeFirstOrThrow();

		return { balance: Number(created.balance) };
	});
}

export type MigrationBatch = {
	scanned: number;
	migrated: number;
	skipped: number;
	nextCursor: string | null;
};

/** Every nickname that can hold money: accounts, players and both plugins. */
async function collectNicknames(cursor: string, limit: number): Promise<string[]> {
	const [accounts, players, playerpointsUsers, charismUsers] = await Promise.all([
		general
			.selectFrom("accounts")
			.select("nickname")
			.where("nickname", ">", cursor)
			.orderBy("nickname", "asc")
			.limit(limit)
			.execute(),
		general
			.selectFrom("players")
			.select("nickname")
			.where("nickname", ">", cursor)
			.orderBy("nickname", "asc")
			.limit(limit)
			.execute(),
		playerpoints
			.selectFrom("playerpoints_username_cache")
			.select("username as nickname")
			.where("username", ">", cursor)
			.orderBy("username", "asc")
			.limit(limit)
			.execute(),
		bisquite
			.selectFrom("cmi_users")
			.select("username as nickname")
			.where("username", ">", cursor)
			.orderBy("username", "asc")
			.limit(limit)
			.execute(),
	]);

	const merged = new Set<string>();

	for (const row of [...accounts, ...players, ...playerpointsUsers, ...charismUsers]) {
		if (row.nickname) merged.add(row.nickname);
	}

	return [...merged]
		.filter((nickname) => nickname > cursor)
		.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
		.slice(0, limit);
}

/**
 * Batched migration for the one-time switch. The caller pages with
 * `nextCursor` until it comes back `null`; every step is idempotent, so an
 * interrupted run is safe to repeat.
 */
export async function migrateBalances({
	cursor = "",
	limit = 200,
}: { cursor?: string; limit?: number } = {}): Promise<MigrationBatch> {
	const nicknames = await collectNicknames(cursor, limit);
	let migrated = 0;
	let skipped = 0;

	for (const nickname of nicknames) {
		for (const currency of CURRENCIES) {
			try {
				const result = await migrateWallet(nickname, currency);
				if (result) migrated += 1;
				else skipped += 1;
			} catch (error) {
				logErrorMsg(error, { subject: "wallet-migration" });
				skipped += 1;
			}
		}
	}

	return {
		scanned: nicknames.length,
		migrated,
		skipped,
		nextCursor: nicknames.length === limit ? nicknames[nicknames.length - 1] ?? null : null,
	};
}

/** All ledger rows of one business operation (used by refunds). */
export async function getOrderEntries(orderId: string): Promise<LedgerEntry[]> {
	return general
		.selectFrom("ledger_entries")
		.selectAll()
		.where("order_id", "=", orderId)
		.orderBy("id", "asc")
		.execute();
}

