/** BELKOIN is the hub: every other currency is priced through it. */
export const RATE_CURRENCIES = ["RUB", "USDT", "USDC", "BELKOIN", "CHARISM"] as const;
export type RateCurrency = typeof RATE_CURRENCIES[number];

export function isRateCurrency(value: string): value is RateCurrency {
	return (RATE_CURRENCIES as readonly string[]).includes(value);
}

export type RateRow = {
	id: number | string;
	from_currency: string;
	to_currency: string;
	rate: number | string;
	spread: number | string;
	disabled?: boolean;
	effective_from: string | Date;
	created_at?: string | Date;
};

/**
 * Picks the newest row per canonical currency pair and drops disabled rows.
 * Both directions of a pair are the same edge, so keeping both would create
 * parallel graph edges with potentially different rates.
 */
export function pickCurrentRates<T extends RateRow>(rows: T[]): T[] {
	const latest = new Map<string, T>();

	for (const row of rows) {
		const [from, to] = [row.from_currency, row.to_currency].sort();
		const key = `${from}:${to}`;
		const current = latest.get(key);

		if (!current) {
			latest.set(key, row);
			continue;
		}

		const currentTime = new Date(current.effective_from).getTime();
		const nextTime = new Date(row.effective_from).getTime();

		if (nextTime > currentTime) latest.set(key, row);
		else if (nextTime === currentTime && row.from_currency < current.from_currency) {
			latest.set(key, row);
		}
	}

	return [...latest.values()].filter((row) => !row.disabled);
}

export type Edge = {
	from: string;
	to: string;
	rate: number;
	spread: number;
};

export type Conversion = {
	amount: number;
	rate: number;
	rawRate: number;
	spread: number;
	path: string[];
};

export function buildEdges(rates: RateRow[]): Edge[] {
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
export function findPath(edges: Edge[], from: string, to: string): Edge[] | null {
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

/**
 * Converts an amount between any two currencies. The spread is taken once, on
 * the edge that lands on BELKOIN (or on the last edge of the path), so the
 * spread is a sink and not a per-hop multiplication.
 */
export function convertWithRates(
	rates: RateRow[],
	{
		amount,
		from,
		to,
		applySpread = true,
	}: {
		amount: number;
		from: string;
		to: string;
		applySpread?: boolean;
	},
): Conversion | null {
	if (amount < 0) return null;

	if (from === to) {
		return { amount, rate: 1, rawRate: 1, spread: 0, path: [from] };
	}

	const path = findPath(buildEdges(rates), from, to);
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
