import { beforeEach, describe, expect, it, mock } from "bun:test";

let rows: { id: number; name: string }[] = [];
let inserted: string[] = [];
let ignoreInsert = false;

mock.module("../database/general-db", () => ({
	general: {
		insertInto: () => ({
			values: (values: { name: string }[]) => ({
				onConflict: () => ({
					execute: async () => {
						if (ignoreInsert) return;

						for (const { name } of values) {
							inserted.push(name);

							if (!rows.some((row) => row.name === name)) {
								rows.push({ id: rows.length + 1, name });
							}
						}
					},
				}),
			}),
		}),
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
	PERMISSION_NAMES,
	analyzePermissions,
	buildPermissionIndex,
	buildPermissions,
	permissionsService,
} = await import("./permissions");

beforeEach(() => {
	rows = [];
	inserted = [];
	ignoreInsert = false;
});

describe("permissions", () => {
	it("builds a normalized flat index", () => {
		const sample: { id: number; name: string }[] = [
			{ id: 1, name: "options.read" },
			{ id: 2, name: "economy.wallet.read" },
		];
		const index = buildPermissionIndex(sample);

		expect(index.get("OPTIONS.READ")).toBe("options.read");
		expect(index.get("ECONOMY.WALLET.READ")).toBe("economy.wallet.read");
	});

	it("counts leaves per depth, not groups", () => {
		const sample: { id: number; name: string }[] = [
			{ id: 1, name: "options.read" },
			{ id: 2, name: "options.update" },
			{ id: 3, name: "economy.wallet.read" },
		];
		const stats = analyzePermissions(buildPermissions(sample));

		expect(stats.total).toBe(3);
		expect(stats.levels).toEqual({ 2: 2, 3: 1 });
	});

	it("creates the rows declared in code", async () => {
		await permissionsService.init({ retries: 1 });

		expect(inserted.sort()).toEqual([...PERMISSION_NAMES].sort());
		expect(permissionsService.get("options.update")).toBe("options.update");
		expect(permissionsService.get("missing.permission")).toBeNull();
		expect(permissionsService.isReady()).toBe(true);
	});

	it("fails when a permission from the catalog has no row", async () => {
		ignoreInsert = true;

		await expect(permissionsService.init({ retries: 1 })).rejects.toThrow(
			/missing from the database/,
		);
	});

	it("returns a copy of the tree", async () => {
		await permissionsService.init({ retries: 1 });

		const list = permissionsService.getList();
		expect(Object.isFrozen(list)).toBe(false);
		expect(list.OPTIONS).toBeDefined();
		expect(list.OPTIONS).toMatchObject({ READ: "options.read", UPDATE: "options.update" });
	});
});
