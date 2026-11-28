import { sql, type Kysely } from "kysely";
import type { DB as GeneralDB } from "@gen/db/general";

/**
 * Leaderboard rows for one backend, or for the whole network when `server` is
 * omitted. Grouping by the lowercased nickname keeps a rename from splitting
 * one player into two rows; `max(nickname)` shows the newest spelling.
 *
 * The aggregate is wrapped in a subquery: cursor pagination filters on
 * `total`, and a bare alias is not allowed in WHERE.
 */
export const playtimeRatingQuery = (db: Kysely<GeneralDB>, server?: string) => {
	const totals = db
		.selectFrom("player_playtime")
		.select(["lower_nickname"])
		.select(sql<string>`max("nickname")`.as("nickname"))
		.select(sql<number>`sum("seconds")`.as("total"))
		.groupBy("lower_nickname")
		.$if(Boolean(server), (query) => query.where("server", "=", server!));

	return db.selectFrom(totals.as("totals")).selectAll();
};
