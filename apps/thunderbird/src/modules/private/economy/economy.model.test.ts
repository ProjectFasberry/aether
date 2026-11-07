import { describe, expect, it } from "bun:test";
import { installDatabaseMocks } from "../../economy/__tests__/mocks";

installDatabaseMocks();

const economy = await import("./economy.model");

describe("ledger cursor", () => {
	it("round-trips the Postgres timestamp text and id", () => {
		const cursor = economy.encodeCursor({
			created_at: new Date("2026-01-01T00:00:00.000Z"),
			created_at_text: "2026-01-01 00:00:00.123456+00",
			id: 42,
		});

		expect(economy.decodeCursor(cursor)).toEqual({
			created_at: "2026-01-01 00:00:00.123456+00",
			id: 42,
		});
	});

	it("accepts a string id and rejects malformed cursors", () => {
		const cursor = economy.encodeCursor({ created_at: new Date(), id: "7" });
		expect(economy.decodeCursor(cursor)?.id).toBe(7);

		expect(economy.decodeCursor("not-a-cursor")).toBeNull();
		expect(economy.decodeCursor(Buffer.from(JSON.stringify({ id: 1 })).toString("base64url"))).toBeNull();
		expect(economy.decodeCursor(Buffer.from(JSON.stringify({
			created_at: "not-a-date",
			id: 1,
		})).toString("base64url"))).toBeNull();
	});
});

describe("admin economy reads", () => {
	it("cannot resolve a player that exists in neither accounts nor players", async () => {
		expect(await economy.findPlayer("nobody")).toBeNull();
	});

	it("returns an empty ledger page", async () => {
		expect(await economy.listLedger({ nickname: "nobody", limit: 10 })).toEqual({
			data: [],
			meta: { hasNextPage: false, endCursor: undefined },
		});
	});

	it("returns null for a missing game order", async () => {
		expect(await economy.refundOrder({
			orderId: "missing",
			adminReason: "test",
			actor: "admin",
		})).toBeNull();
	});
});
