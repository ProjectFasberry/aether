import { general } from "#/shared/database/general-db";
import { logErrorMsg } from "#/utils/config/log-utils";
import {
	credit,
	debit,
	economyTransaction,
	flushProjections,
	refundPurchasesInTransaction,
	type Currency,
	type LedgerEntry,
	type RefundedPurchase,
} from "#/modules/economy/wallet.model";
import { enqueueGrantJob, processGrantJobs } from "#/modules/economy/grant-jobs.model";
import { sql } from "kysely";

const db = general;

export type LedgerCursor = { created_at: string; id: number };

/** Panel shape: pg returns bigint columns as strings, the UI expects numbers. */
export type LedgerEntryView = Omit<LedgerEntry, "id" | "delta" | "balance_after"> & {
	id: number;
	delta: number;
	balance_after: number;
};

export function encodeCursor(row: { created_at: Date | string; created_at_text?: string; id: number | string }): string {
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
}): Promise<{ data: LedgerEntryView[]; meta: { hasNextPage: boolean; endCursor?: string } }> {
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

	const raw = await query.execute();
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
				? encodeCursor(raw[raw.length - 1])
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

export type RefundResult = RefundedPurchase;

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
		const gameOrder = await trx
			.selectFrom("payments_game")
			.select(["refunded_at"])
			.where("unique_id", "=", orderId)
			.forUpdate()
			.executeTakeFirst();

		if (!gameOrder) return null;

		// A refunded order must not be delivered later by the outbox.
		if (!gameOrder.refunded_at) {
			await trx
				.deleteFrom("grant_jobs")
				.where("order_id", "=", orderId)
				.where("kind", "=", "store.fulfillment")
				.where("status", "in", ["pending", "failed"])
				.execute();
		}

		const { applied, refunded } = await refundPurchasesInTransaction(trx, {
			orderId,
			reasonPrefix: "store.refund",
			actor,
			metadata: (entry) => ({ adminReason, source: "admin.refund", originalReason: entry.reason }),
			// A retry may be the first place that sees a refund written by an
			// older build without a revoke job.
			resync: Boolean(gameOrder.refunded_at),
		});

		if (!gameOrder.refunded_at) {
			await trx
				.updateTable("payments_game")
				.set({ refunded_at: new Date(), failure_reason: "admin refund" })
				.where("unique_id", "=", orderId)
				.execute();
		}

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
