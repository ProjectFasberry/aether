import { describe, expect, it } from "bun:test";
import { pickCurrentRates, type RateRow } from "./rates.pure";

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
