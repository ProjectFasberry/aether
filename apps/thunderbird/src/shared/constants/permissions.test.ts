import { describe, expect, it, mock } from "bun:test";

const rows = [
	{ id: 1, name: "options.read" },
	{ id: 2, name: "options.update" },
	{ id: 3, name: "economy.wallet.read" },
];

mock.module("../database/general-db", () => ({
	general: {
		selectFrom: () => ({
			selectAll: () => ({
				orderBy: () => ({
					execute: async () => rows,
				}),
			}),
		}),
	},
}));

const {
	analyzePermissions,
	buildPermissionIndex,
	buildPermissions,
	permissionsService,
} = await import("./permissions");

describe("permissions", () => {
	it("builds a normalized flat index", () => {
		const index = buildPermissionIndex(rows);

		expect(index.get("OPTIONS.READ")).toBe("options.read");
		expect(index.get("ECONOMY.WALLET.READ")).toBe("economy.wallet.read");
	});

	it("counts leaves per depth, not groups", () => {
		const stats = analyzePermissions(buildPermissions(rows));

		expect(stats.total).toBe(3);
		expect(stats.levels).toEqual({ 2: 2, 3: 1 });
	});

	it("resolves permissions after init and returns a copy", async () => {
		await permissionsService.init({ retries: 1 });

		expect(permissionsService.get("options.update")).toBe("options.update");
		expect(permissionsService.get("missing.permission")).toBeNull();

		const list = permissionsService.getList();
		expect(Object.isFrozen(list)).toBe(false);
		expect(list).toEqual({
			OPTIONS: { READ: "options.read", UPDATE: "options.update" },
			ECONOMY: { WALLET: { READ: "economy.wallet.read" } },
		});
	});
});
