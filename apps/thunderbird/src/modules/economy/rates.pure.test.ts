import { describe, expect, it } from "bun:test";
import {
	buildEdges,
	convertWithRates,
	findPath,
	isRateCurrency,
	pickCurrentRates,
	RATE_CURRENCIES,
	type RateRow,
} from "./rates.pure";

function rate(overrides: Partial<RateRow> & Pick<RateRow, "id">): RateRow {
	return {
		from_currency: "RUB",
		to_currency: "BELKOIN",
		rate: 1,
		spread: 0,
		effective_from: "2026-01-01T00:00:00.000Z",
		...overrides,
	};
}

describe("exchange rate history", () => {
	it("keeps the newest row per canonical pair", () => {
		const rows = [
			rate({ id: 1, rate: 1, effective_from: "2026-01-01T00:00:00.000Z" }),
			rate({ id: 2, rate: 2, effective_from: "2026-02-01T00:00:00.000Z" }),
		];

		expect(pickCurrentRates(rows).map((row) => row.id)).toEqual([2]);
	});

	it("collapses a pair entered in both directions", () => {
		const rows = [
			rate({ id: 1, from_currency: "RUB", to_currency: "BELKOIN", effective_from: "2026-01-01T00:00:00.000Z" }),
			rate({ id: 2, from_currency: "BELKOIN", to_currency: "RUB", effective_from: "2026-02-01T00:00:00.000Z" }),
		];

		const picked = pickCurrentRates(rows);
		expect(picked).toHaveLength(1);
		expect(picked[0].id).toBe(2);
	});

	it("drops a pair whose newest row is disabled", () => {
		const rows = [
			rate({ id: 1, effective_from: "2026-01-01T00:00:00.000Z" }),
			rate({ id: 2, disabled: true, effective_from: "2026-02-01T00:00:00.000Z" }),
		];

		expect(pickCurrentRates(rows)).toEqual([]);
	});
});

describe("currency guard", () => {
	it("accepts only priced currencies", () => {
		for (const currency of RATE_CURRENCIES) expect(isRateCurrency(currency)).toBe(true);
		expect(isRateCurrency("ETH")).toBe(false);
		expect(isRateCurrency("belkoin")).toBe(false);
	});
});

describe("conversion graph", () => {
	const rows = [
		rate({ id: 1, from_currency: "RUB", to_currency: "BELKOIN", rate: 0.01, spread: 0.05 }),
		rate({ id: 2, from_currency: "BELKOIN", to_currency: "USDT", rate: 1.05, spread: 0.02 }),
	];

	it("adds both directions, skipping a zero rate edge", () => {
		const edges = buildEdges(rows);
		expect(edges).toHaveLength(4);
		expect(edges).toContainEqual({ from: "BELKOIN", to: "RUB", rate: 100, spread: 0.05 });
		expect(edges).toContainEqual({ from: "USDT", to: "BELKOIN", rate: 1 / 1.05, spread: 0.02 });

		const zero = buildEdges([rate({ id: 3, rate: 0 })]);
		expect(zero).toHaveLength(1);
	});

	it("finds the shortest path", () => {
		const edges = buildEdges(rows);
		expect(findPath(edges, "RUB", "USDT")?.map((edge) => edge.to)).toEqual(["BELKOIN", "USDT"]);
		expect(findPath(edges, "RUB", "RUB")).toEqual([]);
		expect(findPath(edges, "RUB", "ETH")).toBeNull();
	});

	it("takes the spread once, on the BELKOIN edge", () => {
		const conversion = convertWithRates(rows, { amount: 100, from: "RUB", to: "USDT" });

		expect(conversion?.path).toEqual(["RUB", "BELKOIN", "USDT"]);
		expect(conversion?.rawRate).toBeCloseTo(0.0105);
		expect(conversion?.spread).toBe(0.05);
		expect(conversion?.rate).toBeCloseTo(0.009975);
		expect(conversion?.amount).toBeCloseTo(0.9975);
	});

	it("can skip the spread", () => {
		const conversion = convertWithRates(rows, { amount: 100, from: "RUB", to: "USDT", applySpread: false });

		expect(conversion?.spread).toBe(0);
		expect(conversion?.rate).toBeCloseTo(0.0105);
	});

	it("uses the inverse edge when converting back", () => {
		const conversion = convertWithRates(rows, { amount: 1, from: "USDT", to: "RUB" });

		expect(conversion?.path).toEqual(["USDT", "BELKOIN", "RUB"]);
		expect(conversion?.spread).toBe(0.02);
		expect(conversion?.rawRate).toBeCloseTo((1 / 1.05) * 100);
	});

	it("returns the identity and rejects a negative amount", () => {
		expect(convertWithRates(rows, { amount: 3, from: "RUB", to: "RUB" })?.amount).toBe(3);
		expect(convertWithRates(rows, { amount: -3, from: "RUB", to: "USDT" })).toBeNull();
	});
});
