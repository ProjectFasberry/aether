import { general } from "#/shared/database/general-db";
import type { ExchangeRates } from "@gen/db/general";
import type { Selectable } from "kysely";
import {
	convertWithRates,
	isRateCurrency,
	pickCurrentRates,
	type Conversion,
} from "./rates.pure";

export {
	RATE_CURRENCIES,
	isRateCurrency,
	type Conversion,
	type RateCurrency,
} from "./rates.pure";

export type ExchangeRate = Selectable<ExchangeRates>;

/** Latest row per pair that is already in effect. */
export async function currentRates(): Promise<ExchangeRate[]> {
	const rows = await general
		.selectFrom("exchange_rates")
		.selectAll()
		.where("effective_from", "<=", new Date())
		.orderBy("effective_from", "desc")
		.execute();

	// A pair may have rows in both directions. Keep only the newest row for the
	// canonical pair, so conversions do not get parallel edges.
	return pickCurrentRates(rows);
}

export async function rateHistory({
	from,
	to,
	limit = 50,
}: {
	from?: string;
	to?: string;
	limit?: number;
} = {}): Promise<ExchangeRate[]> {
	let query = general
		.selectFrom("exchange_rates")
		.selectAll()
		.orderBy("effective_from", "desc")
		.limit(limit);

	if (from) query = query.where("from_currency", "=", from);
	if (to) query = query.where("to_currency", "=", to);

	return await query.execute();
}

export async function addRate(input: {
	from: string;
	to: string;
	rate: number;
	spread: number;
	effectiveFrom?: Date;
}): Promise<ExchangeRate> {
	const row = await general
		.insertInto("exchange_rates")
		.values({
			from_currency: input.from,
			to_currency: input.to,
			rate: input.rate,
			spread: input.spread,
			disabled: false,
			effective_from: input.effectiveFrom ?? new Date(),
		})
		.onConflict((oc) => oc
			.columns(["from_currency", "to_currency", "effective_from"])
			.doUpdateSet({
				rate: input.rate,
				spread: input.spread,
				disabled: false,
			}))
		.returningAll()
		.executeTakeFirstOrThrow();

	return row;
}

export async function updateRate(input: {
	id: number;
	rate?: number;
	spread?: number;
	effectiveFrom?: Date;
}): Promise<ExchangeRate | null> {
	const existing = await general
		.selectFrom("exchange_rates")
		.selectAll()
		.where("id", "=", String(input.id))
		.executeTakeFirst();

	if (!existing) return null;

	const rate = input.rate ?? Number(existing.rate);
	const spread = input.spread ?? Number(existing.spread);
	const effectiveFrom = input.effectiveFrom ?? new Date();

	// Append a new history row. Equal timestamps correct the same moment
	// instead of violating the pair/effective unique index.
	const row = await general
		.insertInto("exchange_rates")
		.values({
			from_currency: existing.from_currency,
			to_currency: existing.to_currency,
			rate,
			spread,
			disabled: false,
			effective_from: effectiveFrom,
		})
		.onConflict((oc) => oc
			.columns(["from_currency", "to_currency", "effective_from"])
			.doUpdateSet({ rate, spread, disabled: false }))
		.returningAll()
		.executeTakeFirstOrThrow();

	return row;
}

export async function deleteRate(id: number): Promise<ExchangeRate | null> {
	const existing = await general
		.selectFrom("exchange_rates")
		.selectAll()
		.where("id", "=", String(id))
		.executeTakeFirst();

	if (!existing) return null;

	// Disable by appending a new row; the old rate stays in history.
	const row = await general
		.insertInto("exchange_rates")
		.values({
			from_currency: existing.from_currency,
			to_currency: existing.to_currency,
			rate: existing.rate,
			spread: existing.spread,
			disabled: true,
			effective_from: new Date(),
		})
		.onConflict((oc) => oc
			.columns(["from_currency", "to_currency", "effective_from"])
			.doUpdateSet({ disabled: true }))
		.returningAll()
		.executeTakeFirstOrThrow();

	return row;
}

/**
 * Thin DB adapter: the graph math lives in `rates.pure`, so it stays testable
 * without a database.
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
	if (!isRateCurrency(from) || !isRateCurrency(to)) return null;
	if (amount < 0) return null;
	if (from === to) return convertWithRates([], { amount, from, to, applySpread });

	return convertWithRates(await currentRates(), { amount, from, to, applySpread });
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
