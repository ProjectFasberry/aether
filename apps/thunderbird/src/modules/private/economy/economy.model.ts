import { general } from "#/shared/database/general-db";
import { logErrorMsg } from "#/utils/config/log-utils";
import {
	CURRENCIES,
	credit,
	debit,
	economyTransaction,
	flushProjections,
	type ApplyResult,
	type Currency,
	type LedgerEntry,
} from "#/modules/economy/wallet.model";
import { enqueueGrantJob, processGrantJobs } from "#/modules/economy/grant-jobs.model";
import type { DB } from "@gen/db/general";
import type { Kysely } from "kysely";
import { sql } from "kysely";

/** `ledger_entries` is newer than the generated schema. */
const db = general as unknown as Kysely<DB & { ledger_entries: any }>;

export type LedgerCursor = { created_at: string; id: number };

export function encodeCursor(row: { created_at: Date | string; created_at_text?: string; id: number }): string {
	return Buffer.from(JSON.stringify({
		// Keep the Postgres text when available: JS Date truncates microseconds.
		created_at: row.created_at_text ?? String(row.created_at),
		id: Number(row.id),
	}), "utf8").toString("base64url");
}

export function decodeCursor(value: string): LedgerCursor | null {
	try {
		const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<LedgerCursor>;

		if (typeof parsed.created_at !== "string" || Number.isNaN(Date.parse(parsed.created_at))) return null;
		if (typeof parsed.id !== "number" || !Number.isInteger(parsed.id)) return null;

		return parsed as LedgerCursor;
	} catch {
		return null;
	}
}

/** Resolves a case-insensitive nickname to the canonical one, if it exists. */
export async function findPlayer(nickname: string): Promise<string | null> {
	const account = await general
		.selectFrom("accounts")
		.select("nickname")
		.where("lower_nickname", "=", nickname.toLowerCase())
		.executeTakeFirst();

	if (account) return account.nickname;

	const player = await general
		.selectFrom("players")
		.select("nickname")
		.where("lower_case_nickname", "=", nickname.toLowerCase())
		.executeTakeFirst();

	return player?.nickname ?? null;
}

export async function listLedger({
	nickname,
	cursor,
	limit = 50,
}: {
	nickname: string;
	cursor?: LedgerCursor | null;
	limit?: number;
}): Promise<{ data: LedgerEntry[]; meta: { hasNextPage: boolean; endCursor?: string } }> {
	let query = db
		.selectFrom("ledger_entries")
		.selectAll()
		.select(sql<string>`"created_at"::text`.as("created_at_text"))
		.where("nickname", "=", nickname)
		.orderBy("created_at", "desc")
		.orderBy("id", "desc")
		.limit(limit + 1);

	if (cursor) {
		const createdAt = sql`${cursor.created_at}::timestamptz`;

		query = query.where(
			sql<boolean>`(
				"created_at" < ${createdAt}
				or ("created_at" = ${createdAt} and "id" < ${cursor.id})
			)`,
		);
	}

	const raw = await query.execute() as unknown as (LedgerEntry & { created_at_text: string })[];
	const hasNextPage = raw.length > limit;
	if (hasNextPage) raw.pop();

	// pg returns bigint columns as strings; the panel expects numbers. The raw
	// timestamp text stays internal to the cursor.
	const rows = raw.map(({ created_at_text, ...row }) => ({
		...row,
		id: Number(row.id),
		delta: Number(row.delta),
		balance_after: Number(row.balance_after),
	}));

	return {
		data: rows,
		meta: {
			hasNextPage,
			endCursor: raw.length > 0
				? encodeCursor(raw[raw.length - 1] as { created_at: Date | string; created_at_text: string; id: number })
				: undefined,
		},
	};
}

export async function adjustBalance({
	nickname,
	currency,
	amount,
	operation,
	adminReason,
	actor,
	idempotencyKey,
}: {
	nickname: string;
	currency: Currency;
	amount: number;
	operation: "credit" | "debit";
	adminReason: string;
	actor: string;
	idempotencyKey?: string;
}) {
	const options = {
		reason: "admin.adjustment",
		actor,
		orderId: idempotencyKey ?? null,
		metadata: { adminReason, operation },
	};

	return operation === "credit"
		? credit(nickname, currency, amount, options)
		: debit(nickname, currency, amount, options);
}

export type RefundResult = {
	currency: Currency;
	amount: number;
	balance: number;
	duplicate: boolean;
};

/**
 * Reverses the money part of a game order. The refund entry reuses the order
 * id, so a repeated click returns the first refund instead of paying twice.
 */
export async function refundOrder({
	orderId,
	adminReason,
	actor,
}: {
	orderId: string;
	adminReason: string;
	actor: string;
}): Promise<RefundResult[] | null> {
	const result = await economyTransaction().execute(async (trx) => {
		// Lock the order for the whole refund: the automatic rollback and a second
		// admin click must see the first refund, not race it.
		const gameOrder = await (trx as any)
			.selectFrom("payments_game")
			.select(["refunded_at"])
			.where("unique_id", "=", orderId)
			.forUpdate()
			.executeTakeFirst();

		if (!gameOrder) return null;

		const entries = await (trx as any)
			.selectFrom("ledger_entries")
			.selectAll()
			.where("order_id", "=", orderId)
			.orderBy("id", "asc")
			.execute() as LedgerEntry[];

		const purchases = entries.filter((entry) => entry.reason.startsWith("store.purchase:"));

		// A duplicate skipped at delivery already refunded its own child. A
		// later full refund must credit only the remaining net amount.
		const partialRefunds = new Map<string, number>();
		for (const entry of entries) {
			if (!entry.reason.startsWith("store.partial_refund:")) continue;
			partialRefunds.set(
				entry.currency,
				(partialRefunds.get(entry.currency) ?? 0) + Math.abs(Number(entry.delta)),
			);
		}

		if (gameOrder.refunded_at) {
			// A retry may be the first place that sees a refund written by an
			// older build without a revoke job.
			await enqueueGrantJob(
				{ orderId, kind: "store.revoke", payload: { orderId } },
				trx,
			);

			// Re-sync in case a previous attempt committed the refund but died
			// before flushing its projections.
			return {
				refunded: [] as RefundResult[],
				applied: purchases.map((entry) => ({
					entry,
					balance: Number(entry.balance_after),
					duplicate: true,
				})) as ApplyResult[],
			};
		}

		// A free order has no purchase entries but still needs a revoke: the
		// delivered item must be reversed even though there is no money to credit.

		// A refunded order must not be delivered later by the outbox.
		await (trx as any)
			.deleteFrom("grant_jobs")
			.where("order_id", "=", orderId)
			.where("kind", "=", "store.fulfillment")
			.where("status", "in", ["pending", "failed"])
			.execute();

		const applied: ApplyResult[] = [];
		const refunded: RefundResult[] = [];

		for (const entry of purchases) {
			const currency = entry.currency as Currency;
			if (!CURRENCIES.includes(currency)) continue;

			const alreadyRefunded = partialRefunds.get(currency) ?? 0;
			const amount = Math.max(0, Math.abs(Number(entry.delta)) - alreadyRefunded);
			if (amount === 0) continue;

			partialRefunds.set(currency, 0);

			const credited = await credit(entry.nickname, currency, amount, {
				reason: `store.refund:${currency}`,
				orderId,
				actor,
				metadata: { adminReason, source: "admin.refund", originalReason: entry.reason },
			}, trx);

			applied.push(credited);
			refunded.push({
				currency,
				amount,
				balance: credited.balance,
				duplicate: credited.duplicate,
			});
		}

		await (trx as any)
			.updateTable("payments_game")
			.set({ refunded_at: new Date(), failure_reason: "admin refund" })
			.where("unique_id", "=", orderId)
			.execute();

		// Reverse the delivered effect. The command is idempotent; running it for
		// a never-delivered item is harmless and covers a partial delivery.
		await enqueueGrantJob(
			{ orderId, kind: "store.revoke", payload: { orderId } },
			trx,
		);

		return { refunded, applied };
	});

	if (!result) return null;

	await flushProjections(result.applied);

	// Run the revoke now instead of waiting for the next cron tick.
	void processGrantJobs(10).catch((error) => {
		logErrorMsg(error, { subject: "store-revoke-trigger" });
	});

	return result.refunded;
}
