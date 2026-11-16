import { beforeEach, describe, expect, it, mock } from "bun:test";

type Insert = { db: string; values: unknown };

const inserts: Insert[] = [];
let existingRow = false;
let failingDb: string | null = null;

const fakeDb = (name: string) => ({
	selectFrom: () => ({
		select: () => ({
			where: () => ({
				executeTakeFirst: async () => (existingRow ? { id: "row" } : undefined),
			}),
		}),
	}),
	insertInto: () => ({
		values: (values: unknown) => ({
			execute: async () => {
				if (failingDb === name) throw new Error(`${name} is down`);
				inserts.push({ db: name, values });
			},
		}),
	}),
});

mock.module("#/shared/database/luckperms-db", () => ({ luckperms: fakeDb("luckperms") }));
mock.module("#/shared/database/playerpoints-db", () => ({ playerpoints: fakeDb("playerpoints") }));
mock.module("#/shared/database/reputation-db", () => ({ reputation: fakeDb("reputation") }));
mock.module("#/shared/database/bisquite-db", () => ({ bisquite: fakeDb("bisquite") }));
mock.module("#/shared/database/lobby-db", () => ({ lobby: fakeDb("lobby") }));
mock.module("./auth.model", () => ({
	authLogger: { child: () => ({ error: () => {} }) },
}));

const { ensurePlayerProfiles } = await import("./register-profiles");

beforeEach(() => {
	inserts.length = 0;
	existingRow = false;
	failingDb = null;
});

describe("ensurePlayerProfiles", () => {
	it("creates a row in every plugin database", async () => {
		await ensurePlayerProfiles({ nickname: "Steve", uuid: "uuid-1" });

		expect(inserts.map((insert) => insert.db).sort()).toEqual([
			"bisquite",
			"lobby",
			"luckperms",
			"playerpoints",
			"reputation",
		]);

		const byDb = Object.fromEntries(inserts.map((insert) => [insert.db, insert.values]));

		expect(byDb.luckperms).toEqual({ uuid: "uuid-1", username: "Steve", primary_group: "default" });
		expect(byDb.playerpoints).toEqual({ username: "Steve", uuid: "uuid-1" });
		expect(byDb.reputation).toEqual({ uuid: "uuid-1" });
		expect(byDb.bisquite).toEqual({ player_uuid: "uuid-1", username: "Steve", nickname: "Steve" });
		expect(byDb.lobby).toEqual({ id: "uuid-1", name: "Steve" });
	});

	it("does not duplicate rows that already exist", async () => {
		existingRow = true;

		await ensurePlayerProfiles({ nickname: "Steve", uuid: "uuid-1" });

		expect(inserts).toHaveLength(0);
	});

	it("keeps creating the other databases when one is down", async () => {
		failingDb = "reputation";

		await ensurePlayerProfiles({ nickname: "Steve", uuid: "uuid-1" });

		expect(inserts.map((insert) => insert.db).sort()).toEqual([
			"bisquite",
			"lobby",
			"luckperms",
			"playerpoints",
		]);
	});
});
