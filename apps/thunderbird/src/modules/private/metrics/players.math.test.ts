import { describe, expect, it } from "bun:test";
import { peakOnline } from "./players.math";

describe("peakOnline", () => {
	it("returns zero for an empty series", () => {
		expect(peakOnline([])).toBe(0);
	});

	it("tracks the running balance", () => {
		expect(peakOnline([
			{ joins: 3, quits: 1 },
			{ joins: 1, quits: 4 },
			{ joins: 5, quits: 0 },
		])).toBe(5);
	});

	it("never goes below zero on stray quits", () => {
		expect(peakOnline([{ joins: 0, quits: 2 }, { joins: 1, quits: 0 }])).toBe(1);
	});
});
