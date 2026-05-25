import { bisquite } from "#/shared/database/bisquite-db";
import { lobby } from "#/shared/database/lobby-db";
import { playerpoints } from "#/shared/database/playerpoints-db";
import { reputation } from "#/shared/database/reputation-db";
import { metaSchema, withMeta } from "#/shared/schemas";
import { getDirection } from "#/utils/config/paginate";
import { wrapMeta } from "#/utils/config/transforms";
import type { DB as bisquiteDB } from "@repo/shared/types/db/bisquite-database-types";
import type { Kysely } from "kysely";
import { executeWithCursorPagination } from "kysely-paginate";
import type { DB as reputationDB } from "@repo/shared/types/db/reputation-database-types";
import { getPlayerAvatar, getPlayersAvatar } from "../skin/skin.model";
import { type Static, t, type TSchema } from "elysia";
import { invariant } from "#/helpers/invariant";
import { general } from "#/shared/database/general-db";

export const ratingSchema = t.Composite([
	t.Pick(metaSchema, ["asc", "limit", "endCursor"]),
	t.Object({
		server: t.Optional(t.String({ minLength: 1 })),
	}),
]);

function getServerDBInstance<T>({ server, dbs }: { server?: string; dbs: Record<string, Kysely<T> | null> }) {
	invariant(server, "Server is not defined")
	const dbInstance = dbs[server];
	invariant(dbInstance, "Target db instance is not defined")
	return { dbInstance };
}

interface RatingEntry {
	schema: TSchema;
	fn: (...args: any[]) => any;
}

export const bySchema = t.UnionEnum([
	"belkoin", "charism", "lands", "reputation", "playtime", "parkour"
]);

type AllowedKeys = Static<typeof bySchema>;
const defineRatingConfig = <T extends Record<AllowedKeys, RatingEntry>>(config: T) => config;

const ratingConfig = defineRatingConfig({
	belkoin: {
		schema: t.Object({
			data: t.Array(
				t.Object({
					nickname: t.String(),
					balance: t.Number(),
					avatar: t.String()
				})
			),
			meta: withMeta
		}),
		fn: getBelkoinRating
	},
	parkour: {
		schema: t.Object({
			data: t.Array(
				t.Object({
					player: t.String(),
					area: t.Nullable(t.String()),
					score: t.Number(),
					gamesplayed: t.Number(),
					nickname: t.String(),
					avatar: t.String()
				})
			),
			meta: withMeta
		}),
		fn: getParkourRating
	},
	playtime: {
		schema: t.Object({
			data: t.Array(
				t.Object({
					nickname: t.String(),
					avatar: t.String(),
					total: t.Number()
				})
			),
			meta: withMeta
		}),
		fn: getPlaytimeRating
	},
	reputation: {
		schema: t.Object({
			data: t.Array(
				t.Object({
					reputation: t.Number(),
					uuid: t.Nullable(t.String()),
					avatar: t.String(),
					nickname: t.String()
				})
			),
			meta: withMeta
		}),
		fn: getReputationRating
	},
	charism: {
		schema: t.Object({
			data: t.Array(
				t.Object({
					nickname: t.String(),
					balance: t.Number(),
					avatar: t.String()
				})
			),
			meta: withMeta
		}),
		fn: getCharismRating
	},
	lands: {
		schema: t.Object({
			data: t.Array(
				t.Object({
					land: t.String(),
					ulid: t.String(),
					chunks_amount: t.Number(),
					name: t.String(),
					members: t.Record(
						t.String(),
						t.Object({
							avatar: t.String(),
							nickname: t.String(),
							chunks: t.Number()
						})
					),
					blocks: t.Any(),
					type: t.String()
				})
			),
			meta: withMeta
		}),
		fn: getLandsRating
	}
})

const configValues = Object.values(ratingConfig);
const allSchemas = configValues.map(item => item.schema);

export const ratingPayload = t.Union(allSchemas);

async function getBelkoinRating({ asc, limit, endCursor }: Static<typeof ratingSchema>): Promise<Static<typeof ratingConfig.belkoin.schema>> {
	const direction = getDirection(asc);

	const query = playerpoints
		.selectFrom("playerpoints_points")
		.innerJoin("playerpoints_username_cache", "playerpoints_points.uuid", "playerpoints_username_cache.uuid")
		.select([
			"playerpoints_points.points",
			"playerpoints_username_cache.username as nickname"
		]);

	const result = await executeWithCursorPagination(query, {
		perPage: limit,
		after: endCursor,
		fields: [{
			key: "points", direction, expression: "points"
		}],
		parseCursor: (cursor) => ({ points: Number(cursor.points) }),
	});

	const avatarsMap = await getPlayersAvatar(result.rows.map(r => r.nickname));

	const data = result.rows.map((row) => ({
		nickname: row.nickname,
		avatar: avatarsMap[row.nickname],
		balance: row.points
	}))

	return { data, meta: wrapMeta(result) };
}

async function getParkourRating({ asc, limit, endCursor }: Static<typeof ratingSchema>): Promise<Static<typeof ratingConfig.parkour.schema>> {
	const direction = getDirection(asc);

	const query = lobby
		.selectFrom("ajparkour_scores")
		.innerJoin("ajparkour_players", "ajparkour_players.id", "ajparkour_scores.player")
		.select([
			"ajparkour_players.gamesplayed",
			"ajparkour_scores.player",
			"ajparkour_scores.score",
			"ajparkour_players.name as nickname",
			"ajparkour_scores.area",
		])
		.where("ajparkour_scores.area", "!=", "overall"); // overall - scores from all areas

	const result = await executeWithCursorPagination(query, {
		perPage: limit,
		after: endCursor,
		fields: [{ key: "score", direction, expression: "score" }],
		parseCursor: (cursor) => ({ score: Number(cursor.score) }),
	});

	const avatarsMap = await getPlayersAvatar(result.rows.map(r => r.nickname!));

	const data = result.rows.map((row) => ({
		player: row.player ?? "unknown",
		nickname: row.nickname ?? "unknown",
		area: row.area,
		avatar: avatarsMap[row.nickname!],
		gamesplayed: Number(row.gamesplayed ?? 0),
		score: Number(row.score ?? 0)
	}))

	return { data, meta: wrapMeta(result) };
}

async function getLandsRating({ asc, limit, endCursor, server }: Static<typeof ratingSchema>): Promise<Static<typeof ratingConfig.lands.schema>> {
	const dbs: Record<string, Kysely<bisquiteDB> | null> = {
		bisquite: bisquite,
		muffin: null,
	};

	const { dbInstance } = getServerDBInstance<bisquiteDB>({ server, dbs });
	const direction = getDirection(asc);

	const landsQuery = dbInstance
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
		]);

	const landsRes = await executeWithCursorPagination(landsQuery, {
		perPage: limit,
		after: endCursor,
		fields: [{
			key: "chunks_amount", direction, expression: "chunks_amount"
		}],
		parseCursor: (cursor) => ({ chunks_amount: Number(cursor.chunks_amount) }),
	});

	const data = await Promise.all(
		landsRes.rows.map(async (row) => {
			const rmembers = JSON.parse(row.members) as Record<string, { chunks: number }>;
			const membersMap: Map<string, { chunks: number, avatar: string, nickname: string }> = new Map()

			for (const [uuid, { chunks }] of Object.entries(rmembers)) {
				const { nickname } = await general
					.selectFrom("players")
					.select("nickname")
					.where("uuid", "=", uuid)
					.executeTakeFirstOrThrow();

				membersMap.set(uuid, {
					nickname,
					avatar: await getPlayerAvatar(nickname),
					chunks
				})
			}

			const members = Object.fromEntries(membersMap)

			return {
				...row,
				members,
				chunks_amount: Number(row.chunks_amount),
				blocks: row.blocks ? JSON.parse(row.blocks) : null,
			}
		})
	)

	return { data, meta: wrapMeta(landsRes) };
}

async function getCharismRating({ asc, limit, endCursor, server }: Static<typeof ratingSchema>): Promise<Static<typeof ratingConfig.charism.schema>> {
	const dbs: Record<string, Kysely<bisquiteDB> | null> = {
		bisquite: bisquite,
		muffin: null,
	};

	const { dbInstance } = getServerDBInstance<bisquiteDB>({ server, dbs });
	const direction = getDirection(asc);

	const query = dbInstance
		.selectFrom("cmi_users")
		.select([
			"Balance as balance",
			"username as nickname"
		]);

	const result = await executeWithCursorPagination(query, {
		perPage: limit,
		after: endCursor,
		fields: [{
			key: "balance", direction, expression: "Balance"
		}],
		parseCursor: (cursor) => ({ balance: Number(cursor.balance) }),
	});

	const avatarsMap = await getPlayersAvatar(result.rows.map(r => r.nickname!));

	const data = result.rows.map((row) => ({
		nickname: row.nickname ?? "unknown",
		balance: Number(row.balance ?? 0),
		avatar: avatarsMap[row.nickname!]
	}))

	return { data, meta: wrapMeta(result) };
}

async function getReputationRating({ asc, limit, endCursor, server }: Static<typeof ratingSchema>): Promise<Static<typeof ratingConfig.reputation.schema>> {
	const dbs: Record<string, Kysely<reputationDB> | null> = {
		bisquite: reputation,
		muffin: null,
	};

	const { dbInstance } = getServerDBInstance<reputationDB>({ server, dbs });
	const direction = getDirection(asc);

	const query = dbInstance
		.selectFrom("reputation")
		.select(["reputation", "reputation.uuid"]);

	const result = await executeWithCursorPagination(query, {
		perPage: limit,
		after: endCursor,
		fields: [{
			key: "reputation", direction, expression: "reputation"
		}],
		parseCursor: (cursor) => ({ reputation: Number(cursor.reputation) }),
	});

	const data = await Promise.all(
		result.rows.map(async (row) => {
			const query = await bisquite
				.selectFrom("cmi_users")
				.select([
					"username as nickname",
					"player_uuid as uuid"
				])
				.where("player_uuid", "=", row.uuid)
				.executeTakeFirstOrThrow();

			const nickname = query.nickname ?? "unknown"

			return {
				reputation: row.reputation ?? 0,
				uuid: row.uuid ?? query.uuid,
				avatar: await getPlayerAvatar(nickname),
				nickname,
			};
		}),
	);

	return { data, meta: wrapMeta(result) };
}

async function getPlaytimeRating({ asc, limit, endCursor, server }: Static<typeof ratingSchema>): Promise<Static<typeof ratingConfig.playtime.schema>> {
	const dbs: Record<string, Kysely<bisquiteDB> | null> = {
		bisquite: bisquite,
		muffin: null,
	};

	const { dbInstance } = getServerDBInstance<bisquiteDB>({ server, dbs });
	const direction = getDirection(asc);

	const query = dbInstance
		.selectFrom("cmi_users")
		.select(["TotalPlayTime as total", "username as nickname"]);

	const result = await executeWithCursorPagination(query, {
		perPage: limit,
		after: endCursor,
		fields: [{
			key: "total", direction, expression: "TotalPlayTime"
		}],
		parseCursor: (cursor) => ({ total: Number(cursor.total) }),
	});

	const avatarsMap = await getPlayersAvatar(result.rows.map(r => r.nickname!));

	const data = result.rows.map((row) => ({
		nickname: row.nickname ?? "unknown",
		avatar: avatarsMap[row.nickname!],
		total: Number(row.total ?? 0)
	}))

	return { data, meta: wrapMeta(result) };
}

export async function getRating(by: AllowedKeys, query: Static<typeof ratingSchema>) {
	return ratingConfig[by].fn?.(query)
}

const RATINGS_SECTIONS = {
	global: {
		title: "Глобальные",
		childs: ["parkour", "belkoin"],
	},
	servers: {
		bisquite: {
			title: "Bisquite",
			childs: ["charism", "playtime", "lands", "reputation"],
		},
		muffin: {
			title: "Muffin",
			childs: ["charism", "playtime"],
		},
	},
};

const RATINGS_SECTIONS_BY_KEY: Record<string, string> = {
	charism: "Харизма",
	reputation: "Репутация",
	lands: "Территории",
	belkoin: "Белкоин",
	playtime: "Время игры",
	parkour: "Паркур",
};

type Node = Pick<typeof RATINGS_SECTIONS.global, "title"> & {
	childs: { title: string; value: string }[];
	key: string;
};

export const buildRatings = () => {
	const result: Node[] = [];

	for (const [k, value] of Object.entries(RATINGS_SECTIONS)) {
		if ("childs" in value) {
			result.push({
				title: value.title,
				key: k,
				childs: value.childs.map((key) => ({
					title: RATINGS_SECTIONS_BY_KEY[key],
					value: key,
				})),
			});
			continue;
		}
		for (const [k, v] of Object.entries(value)) {
			if ("childs" in v) {
				result.push({
					title: v.title,
					key: k,
					childs: v.childs.map((key) => ({
						title: RATINGS_SECTIONS_BY_KEY[key],
						value: key,
					})),
				});
			}
		}
	}

	return result;
};