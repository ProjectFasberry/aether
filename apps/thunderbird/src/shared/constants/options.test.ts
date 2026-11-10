import { beforeEach, describe, expect, it, mock } from "bun:test";

const db = {
	value: true as boolean | undefined,
	reads: 0,
	updates: 0,
};

const published: string[] = [];

const fakeGeneral = {
	selectFrom: () => ({
		select: () => ({
			where: (_column: string, _operator: string, _name: string) => ({
				executeTakeFirst: async () => {
					db.reads += 1;
					return db.value === undefined ? undefined : { value: db.value };
				},
			}),
		}),
	}),
	updateTable: () => ({
		set: ({ value }: { value: boolean }) => ({
			where: () => ({
				returning: () => ({
					executeTakeFirst: async () => {
						db.updates += 1;
						db.value = value;
						return { value };
					},
				}),
			}),
		}),
	}),
};

mock.module("../database/general-db", () => ({ general: fakeGeneral }));
mock.module("../redis/client", () => ({
	redisService: {
		getInstance: () => ({
			publish: async (_channel: string, message: string) => {
				published.push(message);
				return 0;
			},
		}),
		getBridgeInstance: () => ({
			subscribe: async () => {},
			on: () => {},
		}),
	},
}));

const { getOption, invalidateOption, setOption } = await import("./options");

beforeEach(async () => {
	db.value = true;
	db.reads = 0;
	db.updates = 0;
	await invalidateOption();
	published.length = 0;
});

describe("options cache", () => {
	it("reads once and serves the cached value", async () => {
		expect(await getOption("botCheckEnabled")).toBe(true);
		expect(await getOption("botCheckEnabled")).toBe(true);

		expect(db.reads).toBe(1);
	});

	it("drops the local cache and publishes invalidation", async () => {
		await getOption("botCheckEnabled");
		db.value = false;

		await invalidateOption("botCheckEnabled");

		expect(await getOption("botCheckEnabled")).toBe(false);
		expect(db.reads).toBe(2);
		expect(published).toEqual(["botCheckEnabled"]);
	});

	it("updates through setOption and invalidates", async () => {
		await getOption("registrationEnabled");

		expect(await setOption("registrationEnabled", false)).toBe(false);
		expect(db.updates).toBe(1);
		expect(await getOption("registrationEnabled")).toBe(false);
		expect(published).toContain("registrationEnabled");
	});
});
