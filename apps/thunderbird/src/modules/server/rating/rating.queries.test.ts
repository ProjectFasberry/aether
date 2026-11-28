import { describe, expect, it } from "bun:test";
import {
	DummyDriver,
	Kysely,
	PostgresAdapter,
	PostgresIntrospector,
	PostgresQueryCompiler,
} from "kysely";
import type { DB as bisquiteDB } from "@gen/db/bisquite";
import type { DB as lobbyDB } from "@gen/db/lobby";
import type { DB as playerpointsDB } from "@gen/db/playerpoints";
import type { DB as reputationDB } from "@gen/db/reputation";
import {
	belkoinRatingQuery,
	charismRatingQuery,
	landsMembersRatingQuery,
	landsRatingQuery,
	parkourRatingQuery,
	purchasesRatingQuery,
	referralsRatingQuery,
	reputationRatingQuery,
	resolveRatingServer,
	wikiRatingQuery,
} from "./rating.queries";
import type { DB as generalDB } from "@gen/db/general";
import { playtimeRatingQuery } from "#/modules/server/playtime/playtime.queries";

/** Compiles a query without a connection: the Postgres driver is never used. */
function dummyDb<T>(): Kysely<T> {
	return new Kysely<T>({
		dialect: {
			createAdapter: () => new PostgresAdapter(),
			createDriver: () => new DummyDriver(),
			createIntrospector: (db) => new PostgresIntrospector(db),
			createQueryCompiler: () => new PostgresQueryCompiler(),
		},
	});
}

function compile(query: { compile: () => { sql: string } }): string {
	return query.compile().sql.toLowerCase();
}

/**
 * A null sort value cannot be encoded into a cursor by `kysely-paginate`, and
 * one such row used to return 500 for the whole page ("unable to encode").
 * These tests keep the null filters in place.
 */
describe("rating queries with cursor pagination", () => {
	it("drops belkoin rows with null points", () => {
		const sql = compile(belkoinRatingQuery(dummyDb<playerpointsDB>()));
		expect(sql).toContain('"playerpoints_points"."points" is not null');
	});

	it("drops parkour rows with null score but keeps the overall filter", () => {
		const sql = compile(parkourRatingQuery(dummyDb<lobbyDB>()));
		expect(sql).toContain('"ajparkour_scores"."score" is not null');
		expect(sql).toContain('"ajparkour_scores"."area" != ');
	});

	it("keeps one parkour row per nickname and map", () => {
		const sql = compile(parkourRatingQuery(dummyDb<lobbyDB>()));
		expect(sql).toContain("row_number() over");
		expect(sql).toContain('partition by lower("ajparkour_players"."name"), "ajparkour_scores"."area"');
		expect(sql).toContain('"ranked"."rn" = ');
	});

	it("drops charism rows with null Balance", () => {
		const sql = compile(charismRatingQuery(dummyDb<bisquiteDB>()));
		expect(sql).toContain('"balance" is not null');
	});

	it("drops reputation rows with null reputation", () => {
		const sql = compile(reputationRatingQuery(dummyDb<reputationDB>()));
		expect(sql).toContain('"reputation"."reputation" is not null');
	});

	it("drops lands rows with null chunks amount", () => {
		const sql = compile(landsRatingQuery(dummyDb<bisquiteDB>()));
		expect(sql).toContain('"lands_lands_claims"."chunks_amount" is not null');
	});
});

describe("aggregated rating queries", () => {
	it("counts only completed referrals", () => {
		const sql = compile(referralsRatingQuery(dummyDb<generalDB>()));
		expect(sql).toContain("count(*)");
		expect(sql).toContain('"completed" = ');
	});

	it("sums playtime per player across servers", () => {
		const sql = compile(playtimeRatingQuery(dummyDb<generalDB>()));
		expect(sql).toContain('sum("seconds")');
		expect(sql).toContain('group by "lower_nickname"');
	});

	it("filters the playtime leaderboard by server when asked", () => {
		const sql = compile(playtimeRatingQuery(dummyDb<generalDB>(), "bisquite"));
		expect(sql).toContain('"server" = ');
	});

	it("ignores wiki revisions without an author", () => {
		const sql = compile(wikiRatingQuery(dummyDb<generalDB>()));
		expect(sql).toContain('"author" is not null');
	});

	it("counts paid orders only", () => {
		const sql = compile(purchasesRatingQuery(dummyDb<generalDB>()));
		expect(sql).toContain('"paid_at" is not null');
	});

	it("ranks lands by the number of members", () => {
		const sql = compile(landsMembersRatingQuery(dummyDb<bisquiteDB>()));
		expect(sql).toContain("json_length");
		expect(sql).toContain('"members" is not null');
	});
});

describe("resolveRatingServer", () => {
	it("falls back to the main server when the query param is missing", () => {
		expect(resolveRatingServer(undefined)).toBe("bisquite");
	});

	it("keeps an explicit server", () => {
		expect(resolveRatingServer("muffin")).toBe("muffin");
	});
});
