export type RateRow = {
	id: number;
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
