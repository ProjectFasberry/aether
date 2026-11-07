import { describe, expect, it, mock } from "bun:test";
import { installDatabaseMocks } from "../__tests__/mocks";

mock.module("#/shared/env", () => ({
	getEnv: () => ({ MUFFIN_MYSQL_URI: undefined }),
}));

installDatabaseMocks();

const { charism } = await import("./model");

describe("charism registry wiring", () => {
	it("exposes both servers and keeps Muffin read-only until opt-in", () => {
		expect(charism.list()).toEqual([
			{ server: "bisquite", title: "Bisquite", available: true, purchasable: true },
			{ server: "muffin", title: "Muffin", available: false, purchasable: false },
		]);
	});

	it("resolves providers by name", () => {
		expect(charism.get("bisquite")?.server).toBe("bisquite");
		expect(charism.get("muffin")?.server).toBe("muffin");
		expect(charism.get("void")).toBeNull();
	});

	it("reads the ledger balance for Bisquite", async () => {
		expect(await charism.balance("bisquite", "nobody")).toBe(0);
	});

	it("returns null for an unavailable or unknown server", async () => {
		expect(await charism.balance("muffin", "nobody")).toBeNull();
		expect(await charism.balance("void", "nobody")).toBeNull();
	});
});
