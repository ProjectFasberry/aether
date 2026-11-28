import { sql, type Kysely } from "kysely";
import type { DB as GeneralDB } from "@gen/db/general";

/**
 * Leaderboard rows for one backend, or for the whole network when `server` is
 * omitted. Rows are grouped by the account UUID: a nickname change renames the
 * display label instead of splitting the time in two.
 *
 * The inner join drops CMI-only names that never registered on the site. The
 * lobby SQLite still contains old/test nicknames, and their numbers are not
 * project playtime.
 *
 * The aggregate is wrapped in a subquery: cursor pagination filters on
 * `total`, and a bare alias is not allowed in WHERE.
 */
export const playtimeRatingQuery = (db: Kysely<GeneralDB>, server?: string) => {
	const totals = db
		.selectFrom("player_playtime")
		.innerJoin("players", "players.uuid", "player_playtime.uuid")
		.select(["player_playtime.uuid"])
		.select(sql<string>`max("players"."nickname")`.as("nickname"))
		.select(sql<number>`sum("player_playtime"."seconds")`.as("total"))
		.groupBy("player_playtime.uuid")
		.$if(Boolean(server), (query) => query.where("player_playtime.server", "=", server!));

	return db.selectFrom(totals.as("totals")).selectAll();
};
