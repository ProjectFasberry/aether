import { describe, expect, it } from "bun:test";
import { createCharismRegistry, isCharismServer, type CharismProvider } from "./contract";

function provider(overrides: Partial<CharismProvider> & Pick<CharismProvider, "server">): CharismProvider {
	return {
		title: overrides.server,
		available: () => true,
		purchasable: () => true,
		getBalance: async () => 10,
		...overrides,
	};
}

describe("charism registry", () => {
	const registry = createCharismRegistry([
		provider({ server: "bisquite" }),
		provider({
			server: "muffin",
			available: () => false,
			purchasable: () => false,
			getBalance: async () => null,
		}),
	]);

	it("lists every server with its flags", () => {
		expect(registry.list()).toEqual([
			{ server: "bisquite", title: "bisquite", available: true, purchasable: true },
			{ server: "muffin", title: "muffin", available: false, purchasable: false },
		]);
	});

	it("reads a balance only from an available server", async () => {
		expect(await registry.balance("bisquite", "player")).toBe(10);
		expect(await registry.balance("muffin", "player")).toBeNull();
		expect(await registry.balance("unknown", "player")).toBeNull();
	});

	it("resolves a provider by server name", () => {
		expect(registry.get("bisquite")?.title).toBe("bisquite");
		expect(registry.get("muffin")?.title).toBe("muffin");
		expect(registry.get("unknown")).toBeNull();
	});

	it("guards the server name", () => {
		expect(isCharismServer("bisquite")).toBe(true);
		expect(isCharismServer("muffin")).toBe(true);
		expect(isCharismServer("void")).toBe(false);
	});
});
