import { describe, expect, it } from "bun:test";
import { nakDelayMs, shouldDeadLetter } from "./nats-retry";

describe("NATS consumer retry", () => {
	it("backs off exponentially from one second", () => {
		expect(nakDelayMs(1)).toBe(1_000);
		expect(nakDelayMs(2)).toBe(2_000);
		expect(nakDelayMs(3)).toBe(4_000);
		expect(nakDelayMs(10)).toBe(60_000);
	});

	it("dead-letters at max_deliver", () => {
		expect(shouldDeadLetter(9, 10)).toBe(false);
		expect(shouldDeadLetter(10, 10)).toBe(true);
		expect(shouldDeadLetter(11, 10)).toBe(true);
	});
});
