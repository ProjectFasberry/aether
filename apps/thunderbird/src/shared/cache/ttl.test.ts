import { beforeEach, describe, expect, it } from "bun:test";
import { cached, clearCacheForTests } from "./ttl";

describe("cached", () => {
	beforeEach(() => clearCacheForTests());

	it("loads once inside the ttl", async () => {
		let calls = 0;
		const load = async () => {
			calls += 1;
			return calls;
		};

		expect(await cached("key", 1_000, load)).toBe(1);
		expect(await cached("key", 1_000, load)).toBe(1);
		expect(calls).toBe(1);
	});

	it("reloads once the ttl is over", async () => {
		let calls = 0;
		const load = async () => {
			calls += 1;
			return calls;
		};

		expect(await cached("key", 0, load)).toBe(1);
		expect(await cached("key", 0, load)).toBe(2);
		expect(calls).toBe(2);
	});

	it("keeps keys apart", async () => {
		expect(await cached("a", 1_000, async () => "a")).toBe("a");
		expect(await cached("b", 1_000, async () => "b")).toBe("b");
	});
});
