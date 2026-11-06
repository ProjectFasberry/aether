import { general } from "#/shared/database/general-db";
import {
	CURRENCIES,
	credit,
	debit,
	getOrderEntries,
	type Currency,
	type LedgerEntry,
} from "#/modules/economy/wallet.model";
import type { DB } from "@gen/db/general";
import type { Kysely } from "kysely";
import { sql } from "kysely";

/** `ledger_entries` is newer than the generated schema. */
const db = general as unknown as Kysely<DB & { ledger_entries: any }>;

export type LedgerCursor = { created_at: string; id: number };

export function encodeCursor(row: { created_at: Date | string; id: number }): string {
	return Buffer.from(JSON.stringify({
		created_at: new Date(row.created_at).toISOString(),
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
		.where("nickname", "=", nickname)
		.orderBy("created_at", "desc")
		.orderBy("id", "desc")
		.limit(limit + 1);

	if (cursor) {
		const createdAt = new Date(cursor.created_at);

		query = query.where(
			sql<boolean>`(
				"created_at" < ${createdAt}
				or ("created_at" = ${createdAt} and "id" < ${cursor.id})
			)`,
		);
	}

	const raw = await query.execute() as unknown as LedgerEntry[];
	const hasNextPage = raw.length > limit;
	if (hasNextPage) raw.pop();

	// pg returns bigint columns as strings; the panel expects numbers.
	const rows = raw.map((row) => ({
		...row,
		id: Number(row.id),
		delta: Number(row.delta),
		balance_after: Number(row.balance_after),
	}));

	return {
		data: rows,
		meta: {
			hasNextPage,
			endCursor: rows.length > 0
				? encodeCursor(rows[rows.length - 1] as { created_at: Date | string; id: number })
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
}: {
	nickname: string;
	currency: Currency;
	amount: number;
	operation: "credit" | "debit";
	adminReason: string;
	actor: string;
}) {
	const options = {
		reason: "admin.adjustment",
		actor,
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
	const entries = await getOrderEntries(orderId);
	const purchases = entries.filter((entry) => entry.reason.startsWith("store.purchase:"));

	if (purchases.length === 0) return null;

	const refunded: RefundResult[] = [];

	for (const entry of purchases) {
		const currency = entry.currency as Currency;
		if (!CURRENCIES.includes(currency)) continue;

		const amount = Math.abs(Number(entry.delta));
		if (amount === 0) continue;

		const result = await credit(entry.nickname, currency, amount, {
			reason: `store.refund:${currency}`,
			orderId,
			actor,
			metadata: { adminReason, source: "admin.refund", originalReason: entry.reason },
		});

		refunded.push({
			currency,
			amount,
			balance: result.balance,
			duplicate: result.duplicate,
		});
	}

	const gameDb = general as unknown as Kysely<DB & { payments_game: any }>;

	await gameDb
		.updateTable("payments_game")
		.set({ refunded_at: new Date() })
		.where("unique_id", "=", orderId)
		.execute();

	return refunded;
}
