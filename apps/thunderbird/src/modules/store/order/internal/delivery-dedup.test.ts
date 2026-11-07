import { describe, expect, it } from "bun:test";
import {
	contextsCover,
	effectCovers,
	nodeCovers,
	parseContexts,
	parseEffectSnapshot,
	parseLuckPermsParentCommand,
	partitionProducts,
	resolveDeliveryEffect,
	sumProductsPrice,
	type DeliveryEffect,
	type DeliveryEffectNode,
} from "./delivery-dedup";

function node(overrides: Partial<DeliveryEffectNode> = {}): DeliveryEffectNode {
	return {
		permission: "group.vip",
		value: true,
		world: "global",
		server: "global",
		contexts: "{}",
		expiry: 0,
		...overrides,
	};
}

function effect(overrides: Partial<DeliveryEffect> = {}): DeliveryEffect {
	return {
		permission: "group.vip",
		value: true,
		world: "global",
		server: "global",
		contexts: {},
		expiry: 0,
		...overrides,
	};
}

describe("delivery deduplication", () => {
	it("treats an exact permanent global grant as owned", () => {
		expect(nodeCovers(node(), effect())).toBe(true);
	});

	it("lets a broader global grant cover a scoped purchase", () => {
		expect(nodeCovers(node(), effect({ server: "survival", world: "world" }))).toBe(true);
	});

	it("does not let a scoped grant cover a global purchase", () => {
		expect(nodeCovers(node({ server: "survival" }), effect())).toBe(false);
		expect(nodeCovers(node({ world: "world" }), effect())).toBe(false);
	});

	it("does not match a different server or world", () => {
		expect(nodeCovers(node({ server: "survival" }), effect({ server: "creative" }))).toBe(false);
		expect(nodeCovers(node({ world: "world" }), effect({ world: "world_nether" }))).toBe(false);
	});

	it("compares extra contexts as a subset", () => {
		expect(contextsCover({ region: "eu" }, { region: "eu", mode: "rpg" })).toBe(true);
		expect(contextsCover({ region: "eu" }, { region: "us" })).toBe(false);
		expect(contextsCover({}, { region: "eu" })).toBe(true);
	});

	it("ignores value in a negated node", () => {
		expect(nodeCovers(node({ value: false }), effect())).toBe(false);
	});

	it("lets permanent cover temporary but not the reverse", () => {
		expect(nodeCovers(node(), effect({ expiry: 1_800_000_000 }))).toBe(true);
		expect(nodeCovers(node({ expiry: 1_800_000_000 }), effect())).toBe(false);
	});

	it("lets a longer temporary grant cover a shorter one", () => {
		expect(nodeCovers(node({ expiry: 1_900_000_000 }), effect({ expiry: 1_800_000_000 }))).toBe(true);
		expect(nodeCovers(node({ expiry: 1_800_000_000 }), effect({ expiry: 1_900_000_000 }))).toBe(false);
	});

	it("treats a repeated line in the same order as a duplicate", () => {
		expect(effectCovers(effect(), effect())).toBe(true);
		expect(effectCovers(effect({ server: "survival" }), effect())).toBe(false);
	});

	it("parses the database context json object", () => {
		expect(parseContexts('{"server":"survival","world":"world","region":"eu"}')).toEqual({
			server: "survival",
			world: "world",
			region: "eu",
		});
		expect(parseContexts("{}")).toEqual({});
		expect(parseContexts(null)).toEqual({});
	});
});

describe("delivery effect resolution", () => {
	it("resolves a donate item to a permanent global group node", () => {
		expect(resolveDeliveryEffect({ recipient: "Steve", type: "donate", value: "vip" })).toEqual(
			effect({ permission: "group.vip" }),
		);
	});

	it("parses an lp parent add command with scopes", () => {
		expect(parseLuckPermsParentCommand(
			"lp user {recipient} parent add vip server=survival world=world region=eu",
			"Steve",
		)).toEqual(effect({
			server: "survival",
			world: "world",
			contexts: { region: "eu" },
		}));
	});

	it("accepts an explicit group prefix and a leading slash", () => {
		expect(parseLuckPermsParentCommand("/lp user Steve parent set group.vip", "Steve")).toEqual(effect());
	});

	it("does not guess for addtemp or arbitrary commands", () => {
		expect(parseLuckPermsParentCommand("lp user Steve parent addtemp vip 1d", "Steve")).toBeNull();
		expect(parseLuckPermsParentCommand("cmi toast Steve hello", "Steve")).toBeNull();
		expect(parseLuckPermsParentCommand("lp user Steve permission set vip true", "Steve")).toBeNull();
	});

	it("reads a persisted effect snapshot", () => {
		expect(parseEffectSnapshot(JSON.stringify(effect({ server: "survival" })))).toEqual(
			effect({ server: "survival" }),
		);
		expect(parseEffectSnapshot(null)).toBeNull();
		expect(parseEffectSnapshot({ permission: "" })).toBeNull();
	});

	it("skips only the duplicate lines of a multi-item order", () => {
		const products = [
			{ id: 1, title: "VIP", recipient: "Steve" },
			{ id: 2, title: "Sword", recipient: "Steve" },
		];
		const { deliverable, skipped } = partitionProducts(products, new Map([
			[0, { effect: effect(), duplicate: true }],
			[1, { effect: null, duplicate: false }],
		]));

		expect(skipped).toEqual([
			{ id: 1, title: "VIP", recipient: "Steve", reason: "PERMISSION_ALREADY_PRESENT" },
		]);
		expect(deliverable).toEqual([products[1]]);
	});

	it("returns no deliverable lines when everything is owned", () => {
		const products = [{ id: 1, title: "VIP", recipient: "Steve" }];
		const { deliverable, skipped } = partitionProducts(products, new Map([
			[0, { effect: effect(), duplicate: true }],
		]));

		expect(deliverable).toHaveLength(0);
		expect(skipped).toHaveLength(1);
	});

	it("sums only the deliverable lines", () => {
		expect(sumProductsPrice([
			{ recipient: "Steve", price: "100", currency: "BELKOIN" },
			{ recipient: "Steve", price: "2.5", currency: "CHARISM" },
			{ recipient: "Steve", price: "999", currency: "UNKNOWN" },
		])).toEqual({ BELKOIN: 100, CHARISM: 2.5 });
	});
});
