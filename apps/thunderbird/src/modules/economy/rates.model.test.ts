import { describe, expect, it } from "bun:test";
import { installDatabaseMocks } from "./__tests__/mocks";

installDatabaseMocks();

const rates = await import("./rates.model");

describe("rate storage on an empty database", () => {
	it("returns no current rates and no history", async () => {
		expect(await rates.currentRates()).toEqual([]);
		expect(await rates.rateHistory()).toEqual([]);
		expect(await rates.rateHistory({ from: "RUB", to: "BELKOIN", limit: 5 })).toEqual([]);
	});

	it("has nothing to update or delete", async () => {
		expect(await rates.updateRate({ id: 1, rate: 2 })).toBeNull();
		expect(await rates.deleteRate(1)).toBeNull();
	});
});

describe("convert", () => {
	it("guards unknown currencies", async () => {
		expect(await rates.convert({ amount: 1, from: "RUB", to: "ETH" })).toBeNull();
		expect(await rates.convert({ amount: 1, from: "ETH", to: "RUB" })).toBeNull();
	});

	it("rejects a negative amount", async () => {
		expect(await rates.convert({ amount: -1, from: "BELKOIN", to: "BELKOIN" })).toBeNull();
	});

	it("returns the identity conversion", async () => {
		expect(await rates.convert({ amount: 12, from: "BELKOIN", to: "BELKOIN" })).toEqual({
			amount: 12,
			rate: 1,
			rawRate: 1,
			spread: 0,
			path: ["BELKOIN"],
		});
	});

	it("returns null when no path exists", async () => {
		expect(await rates.convert({ amount: 1, from: "RUB", to: "USDT" })).toBeNull();
	});

	it("rounds a top-up value down to whole BELKOIN", async () => {
		expect(await rates.belkoinFor(5.9, "BELKOIN")).toEqual({
			amount: 5,
			conversion: { amount: 5.9, rate: 1, rawRate: 1, spread: 0, path: ["BELKOIN"] },
		});
		expect(await rates.belkoinFor(1, "ETH")).toBeNull();
	});
});
