import { sql, type Kysely } from "kysely"
import type { DB as bisquiteDB } from "@gen/db/bisquite"
import type { DB as lobbyDB } from "@gen/db/lobby"
import type { DB as playerpointsDB } from "@gen/db/playerpoints"
import type { DB as reputationDB } from "@gen/db/reputation"

/**
 * Cursor pagination encodes the value of the sort column into the cursor, and
 * `kysely-paginate` cannot encode `null`. A row with a null sort value would
 * therefore turn the whole page into a 500, so every rating query drops those
 * rows instead of ranking them.
 */

export const belkoinRatingQuery = (db: Kysely<playerpointsDB>) =>
	db
		.selectFrom("playerpoints_points")
		.innerJoin("playerpoints_username_cache", "playerpoints_points.uuid", "playerpoints_username_cache.uuid")
		.select([
			"playerpoints_points.points",
			"playerpoints_username_cache.username as nickname",
		])
		.where("playerpoints_points.points", "is not", null)

export const parkourRatingQuery = (db: Kysely<lobbyDB>) => {
	// The same nickname can exist twice in the plugin tables (a premium and an
	// offline UUID), so one player produced two rows on the same map. Keep the
	// best result per lowercased nickname and area.
	const ranked = db
		.selectFrom("ajparkour_scores")
		.innerJoin("ajparkour_players", "ajparkour_players.id", "ajparkour_scores.player")
		.select([
			"ajparkour_players.gamesplayed",
			"ajparkour_scores.player",
			"ajparkour_scores.score",
			"ajparkour_players.name as nickname",
			"ajparkour_scores.area",
			sql<number>`row_number() over (
				partition by lower(${sql.ref("ajparkour_players.name")}), ${sql.ref("ajparkour_scores.area")}
				order by ${sql.ref("ajparkour_scores.score")} desc
			)`.as("rn"),
		])
		// overall - scores from all areas
		.where("ajparkour_scores.area", "!=", "overall")
		.where("ajparkour_scores.score", "is not", null)

	return db
		.selectFrom(ranked.as("ranked"))
		.select(["gamesplayed", "player", "score", "nickname", "area"])
		.where("ranked.rn", "=", 1)
}

export const playtimeRatingQuery = (db: Kysely<bisquiteDB>) =>
	db
		.selectFrom("cmi_users")
		.select(["TotalPlayTime as total", "username as nickname"])
		.where("TotalPlayTime", "is not", null)

export const charismRatingQuery = (db: Kysely<bisquiteDB>) =>
	db
		.selectFrom("cmi_users")
		.select(["Balance as balance", "username as nickname"])
		.where("Balance", "is not", null)

export const reputationRatingQuery = (db: Kysely<reputationDB>) =>
	db
		.selectFrom("reputation")
		.select(["reputation", "reputation.uuid"])
		.where("reputation.reputation", "is not", null)

export const landsRatingQuery = (db: Kysely<bisquiteDB>) =>
	db
		.selectFrom("lands_lands_claims")
		.innerJoin("lands_lands", "lands_lands_claims.land", "lands_lands.ulid")
		.select([
			"lands_lands_claims.land",
			"lands_lands.ulid",
			"lands_lands_claims.chunks_amount",
			"lands_lands_claims.blocks",
			"lands_lands.name",
			"lands_lands.members",
			"lands_lands.type",
		])
		.where("lands_lands_claims.chunks_amount", "is not", null)

/** Player-scoped ratings fall back to the main server when none is given. */
export const resolveRatingServer = (server?: string): string => server ?? "bisquite"

type GeneralDB = import("@gen/db/general").DB

/**
 * Grouped queries are wrapped in a subquery: cursor pagination filters on the
 * aggregate column, and a bare alias cannot be used in WHERE.
 */
export const referralsRatingQuery = (db: Kysely<GeneralDB>) =>
	db
		.selectFrom(
			db
				.selectFrom("referrals")
				.select("referrer as nickname")
				.select((eb) => eb.fn.countAll<number>().as("referrals"))
				.where("completed", "=", true)
				.groupBy("referrer")
				.as("counted"),
		)
		.selectAll()

export const wikiRatingQuery = (db: Kysely<GeneralDB>) =>
	db
		.selectFrom(
			db
				.selectFrom("wiki_revisions")
				.select("author as nickname")
				.select((eb) => eb.fn.countAll<number>().as("revisions"))
				.where("author", "is not", null)
				.groupBy("author")
				.as("counted"),
		)
		.selectAll()

export const purchasesRatingQuery = (db: Kysely<GeneralDB>) =>
	db
		.selectFrom(
			db
				.selectFrom("orders")
				.select("nickname")
				.select((eb) => eb.fn.countAll<number>().as("purchases"))
				.where("paid_at", "is not", null)
				.groupBy("nickname")
				.as("counted"),
		)
		.selectAll()

export const landsMembersRatingQuery = (db: Kysely<bisquiteDB>) =>
	db
		.selectFrom("lands_lands")
		.select(["ulid", "name"])
		.select(sql<number>`JSON_LENGTH(${sql.ref("members")})`.as("members_count"))
		.where("members", "is not", null)
