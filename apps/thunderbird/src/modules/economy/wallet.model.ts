import { randomUUID } from "node:crypto";
import { general } from "#/shared/database/general-db";
import { playerpoints } from "#/shared/database/playerpoints-db";
import { bisquite } from "#/shared/database/bisquite-db";
import { logErrorMsg } from "#/utils/config/log-utils";
import type { DB } from "@gen/db/general";
import type { Kysely, Transaction } from "kysely";
import { enqueueGrantJob, registerGrantHandler } from "./grant-jobs.model";

export const CURRENCIES = ["BELKOIN", "CHARISM"] as const;
export type Currency = typeof CURRENCIES[number];

/**
 * The new tables are additive and not part of the generated `DB` type yet.
 * Their Kysely surface is `any` on purpose: the generated schema is refreshed
 * separately, while the service keeps its own row types below.
 */
type EconomyDB = {
	wallets: any;
	ledger_entries: any;
	grant_jobs: any;
};

export type EconomyTrx = Transaction<DB & EconomyDB>;

type LedgerRow = {
	id: number;
	nickname: string;
	currency: string;
	delta: number;
	balance_after: number;
	reason: string;
	order_id: string | null;
	actor: string | null;
	metadata: unknown;
	created_at: Date;
};

const db = general as unknown as Kysely<DB & EconomyDB>;

/** Economy-aware transaction; every money change must run inside one. */
export function economyTransaction() {
	return db.transaction();
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
	metadata?: Record<string, unknown>;
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
	const wallet = await db
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

export async function getHistory(nickname: string, limit = 50): Promise<LedgerEntry[]> {
	return db
		.selectFrom("ledger_entries")
		.selectAll()
		.where("nickname", "=", nickname)
		.orderBy("created_at", "desc")
		.orderBy("id", "desc")
		.limit(limit)
		.execute() as unknown as Promise<LedgerEntry[]>;
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
export async function applyInTransaction(trx: EconomyTrx, input: ApplyInput): Promise<ApplyResult> {
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
			.executeTakeFirst() as unknown as LedgerRow | undefined;

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

	const balance = Number(wallet.balance) + delta;
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
		.executeTakeFirstOrThrow() as unknown as LedgerRow;

	return { balance, entry, duplicate: false };
}

export async function apply(input: ApplyInput): Promise<ApplyResult> {
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
			const existing = await db
				.selectFrom("ledger_entries")
				.selectAll()
				.where("order_id", "=", orderId)
				.where("reason", "=", reason)
				.executeTakeFirst() as unknown as LedgerRow | undefined;

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
		return await fn();
	} finally {
		release();

		if (projectionLocks.get(key) === queued) projectionLocks.delete(key);
	}
}

async function currentWalletBalance(nickname: string, currency: Currency): Promise<number> {
	const wallet = await db
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
	const currency = entry.currency as Currency;

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

registerGrantHandler("BELKOIN", async (payload) => {
	await syncProjection(String(payload.nickname), "BELKOIN");
});

registerGrantHandler("CHARISM", async (payload) => {
	await syncProjection(String(payload.nickname), "CHARISM");
});

/**
 * One-off migration: copies the plugin balance into a wallet and records an
 * opening ledger entry. Idempotent through `migration:<nickname>:<currency>`
 * and a no-op once the wallet exists (first write seeds it automatically).
 */
export async function migrateWallet(
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
			.where("username", "is not", null)
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
	return db
		.selectFrom("ledger_entries")
		.selectAll()
		.where("order_id", "=", orderId)
		.orderBy("id", "asc")
		.execute() as unknown as Promise<LedgerEntry[]>;
}

