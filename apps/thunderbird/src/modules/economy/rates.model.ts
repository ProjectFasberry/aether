import { general } from "#/shared/database/general-db";
import type { DB } from "@gen/db/general";
import type { Kysely } from "kysely";

/** BELKOIN is the hub: every other currency is priced through it. */
export const RATE_CURRENCIES = ["RUB", "USDT", "USDC", "BELKOIN", "CHARISM"] as const;
export type RateCurrency = typeof RATE_CURRENCIES[number];

export type ExchangeRate = {
	id: number;
	from_currency: string;
	to_currency: string;
	rate: number;
	spread: number;
	effective_from: Date;
	created_at: Date;
};

type Edge = {
	from: string;
	to: string;
	rate: number;
	spread: number;
};

const db = general as unknown as Kysely<DB & { exchange_rates: any }>;

function isCurrency(value: string): value is RateCurrency {
	return (RATE_CURRENCIES as readonly string[]).includes(value);
}

/** Latest row per pair that is already in effect. */
export async function currentRates(): Promise<ExchangeRate[]> {
	const rows = await db
		.selectFrom("exchange_rates")
		.selectAll()
		.where("effective_from", "<=", new Date())
		.orderBy("from_currency", "asc")
		.orderBy("to_currency", "asc")
		.orderBy("effective_from", "desc")
		.execute() as unknown as ExchangeRate[];

	const latest = new Map<string, ExchangeRate>();

	for (const row of rows) {
		const key = `${row.from_currency}:${row.to_currency}`;
		if (!latest.has(key)) latest.set(key, row);
	}

	return [...latest.values()];
}

export async function rateHistory({
	from,
	to,
	limit = 50,
}: {
	from?: string;
	to?: string;
	limit?: number;
}): Promise<ExchangeRate[]> {
	let query = db
		.selectFrom("exchange_rates")
		.selectAll()
		.orderBy("effective_from", "desc")
		.limit(limit);

	if (from) query = query.where("from_currency", "=", from);
	if (to) query = query.where("to_currency", "=", to);

	return await query.execute() as unknown as ExchangeRate[];
}

export async function addRate(input: {
	from: string;
	to: string;
	rate: number;
	spread: number;
	effectiveFrom?: Date;
}): Promise<ExchangeRate> {
	const row = await db
		.insertInto("exchange_rates")
		.values({
			from_currency: input.from,
			to_currency: input.to,
			rate: input.rate,
			spread: input.spread,
			effective_from: input.effectiveFrom ?? new Date(),
		})
		.returningAll()
		.executeTakeFirstOrThrow() as unknown as ExchangeRate;

	return row;
}

export async function updateRate(input: {
	id: number;
	rate?: number;
	spread?: number;
	effectiveFrom?: Date;
}): Promise<ExchangeRate | null> {
	const updates: Record<string, unknown> = {};

	if (input.rate !== undefined) updates.rate = input.rate;
	if (input.spread !== undefined) updates.spread = input.spread;
	if (input.effectiveFrom !== undefined) updates.effective_from = input.effectiveFrom;
	if (Object.keys(updates).length === 0) return null;

	const row = await db
		.updateTable("exchange_rates")
		.set(updates)
		.where("id", "=", input.id)
		.returningAll()
		.executeTakeFirst() as unknown as ExchangeRate | undefined;

	return row ?? null;
}

export async function deleteRate(id: number): Promise<ExchangeRate | null> {
	const row = await db
		.deleteFrom("exchange_rates")
		.where("id", "=", id)
		.returningAll()
		.executeTakeFirst() as unknown as ExchangeRate | undefined;

	return row ?? null;
}

function buildEdges(rates: ExchangeRate[]): Edge[] {
	const edges: Edge[] = [];

	for (const row of rates) {
		const rate = Number(row.rate);
		const spread = Number(row.spread);

		edges.push({ from: row.from_currency, to: row.to_currency, rate, spread });
		if (rate > 0) {
			edges.push({ from: row.to_currency, to: row.from_currency, rate: 1 / rate, spread });
		}
	}

	return edges;
}

/** Shortest conversion path; the graph is tiny, so BFS is enough. */
function findPath(edges: Edge[], from: string, to: string): Edge[] | null {
	if (from === to) return [];

	const visited = new Set<string>([from]);
	const queue: { node: string; path: Edge[] }[] = [{ node: from, path: [] }];

	while (queue.length > 0) {
		const current = queue.shift();
		if (!current) break;

		for (const edge of edges) {
			if (edge.from !== current.node || visited.has(edge.to)) continue;

			const path = [...current.path, edge];
			if (edge.to === to) return path;

			visited.add(edge.to);
			queue.push({ node: edge.to, path });
		}
	}

	return null;
}

export type Conversion = {
	amount: number;
	rate: number;
	rawRate: number;
	spread: number;
	path: string[];
};

/**
 * Converts an amount between any two currencies. The spread is taken once, on
 * the edge that lands on BELKOIN (or on the last edge of the path), so the
 * spread is a sink and not a per-hop multiplication.
 */
export async function convert({
	amount,
	from,
	to,
	applySpread = true,
}: {
	amount: number;
	from: string;
	to: string;
	applySpread?: boolean;
}): Promise<Conversion | null> {
	if (!isCurrency(from) || !isCurrency(to)) return null;
	if (amount < 0) return null;

	if (from === to) {
		return { amount, rate: 1, rawRate: 1, spread: 0, path: [from] };
	}

	const edges = buildEdges(await currentRates());
	const path = findPath(edges, from, to);
	if (!path) return null;

	let rawRate = 1;
	for (const edge of path) rawRate *= edge.rate;

	const spreadEdge = [...path].reverse().find((edge) => edge.to === "BELKOIN") ?? path[path.length - 1];
	const spread = applySpread ? spreadEdge.spread : 0;
	const rate = rawRate * (1 - spread);

	return {
		amount: amount * rate,
		rate,
		rawRate,
		spread,
		path: [from, ...path.map((edge) => edge.to)],
	};
}

/** BELKOIN is whole units: a purchase never credits a fraction. */
export async function belkoinFor(amount: number, currency: string): Promise<{
	amount: number;
	conversion: Conversion;
} | null> {
	const conversion = await convert({ amount, from: currency, to: "BELKOIN" });
	if (!conversion) return null;

	return { amount: Math.floor(conversion.amount), conversion };
}
