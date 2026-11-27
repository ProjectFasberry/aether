import { bisquite } from "#/shared/database/bisquite-db";
import { lobby } from "#/shared/database/lobby-db";
import { playerpoints } from "#/shared/database/playerpoints-db";
import { reputation } from "#/shared/database/reputation-db";
import { metaSchema, withMeta } from "#/shared/schemas";
import { getDirection } from "#/helpers/pagination";
import { toPageMeta } from "#/helpers/pagination";
import type { DB as bisquiteDB } from "@gen/db/bisquite";
import { sql, type Kysely } from "kysely";
import { executeWithCursorPagination } from "kysely-paginate";
import type { DB as reputationDB } from "@gen/db/reputation";
import { type Static, t, type TSchema } from "elysia";
import { general } from "#/shared/database/general-db";
import { skinsService } from "../../../shared/services/skins";
import {
	belkoinRatingQuery, charismRatingQuery, landsMembersRatingQuery, landsRatingQuery,
	parkourRatingQuery, playtimeRatingQuery, purchasesRatingQuery, referralsRatingQuery,
	reputationRatingQuery, resolveRatingServer, votesRatingQuery, wikiRatingQuery,
} from "./rating.queries";

export const ratingSchema = t.Composite([
	t.Pick(metaSchema, ["asc", "limit", "endCursor"]),
	t.Object({
		server: t.Optional(t.String({ minLength: 1 })),
	}),
]);

/** The server exists in the catalog but has no database yet. */
class MissingServerDatabase extends Error {}

function getServerDBInstance<T>({ server, dbs }: { server?: string; dbs: Record<string, Kysely<T> | null> }) {
	const key = resolveRatingServer(server)
	const dbInstance = dbs[key];
	if (!dbInstance) throw new MissingServerDatabase(`No database for server "${key}"`);
	return { dbInstance };
}

interface RatingEntry {
	schema: TSchema;
	fn: (query: Static<typeof ratingSchema>) => Promise<unknown>;
}

export const bySchema = t.UnionEnum([
	"belkoin", "charism", "lands", "lands-members", "reputation", "playtime", "parkour",
	"votes", "wiki", "referrals", "purchases",
]);

type AllowedKeys = Static<typeof bySchema>;
const defineRatingConfig = <T extends Record<AllowedKeys, RatingEntry>>(config: T) => config;

const ratingConfig = defineRatingConfig({
	belkoin: {
		schema: t.Object({
			data: t.Array(
				t.Object({
					kind: t.Literal("belkoin"),
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
					kind: t.Literal("parkour"),
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
					kind: t.Literal("playtime"),
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
					kind: t.Literal("reputation"),
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
					kind: t.Literal("charism"),
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
					kind: t.Literal("lands"),
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
	},
	"lands-members": {
		schema: t.Object({
			data: t.Array(
				t.Object({
					kind: t.Literal("lands-members"),
					ulid: t.String(),
					name: t.String(),
					members_count: t.Number(),
				})
			),
			meta: withMeta
		}),
		fn: getLandsMembersRating
	},
	votes: {
		schema: t.Object({
			data: t.Array(
				t.Object({
					kind: t.Literal("votes"),
					nickname: t.String(),
					votes: t.Number(),
					avatar: t.String(),
				})
			),
			meta: withMeta
		}),
		fn: getVotesRating
	},
	wiki: {
		schema: t.Object({
			data: t.Array(
				t.Object({
					kind: t.Literal("wiki"),
					nickname: t.String(),
					revisions: t.Number(),
					avatar: t.String(),
				})
			),
			meta: withMeta
		}),
		fn: getWikiRating
	},
	referrals: {
		schema: t.Object({
			data: t.Array(
				t.Object({
					kind: t.Literal("referrals"),
					nickname: t.String(),
					referrals: t.Number(),
					avatar: t.String(),
				})
			),
			meta: withMeta
		}),
		fn: getReferralsRating
	},
	purchases: {
		schema: t.Object({
			data: t.Array(
				t.Object({
					kind: t.Literal("purchases"),
					nickname: t.String(),
					purchases: t.Number(),
					avatar: t.String(),
				})
			),
			meta: withMeta
		}),
		fn: getPurchasesRating
	}
})

const configValues = Object.values(ratingConfig);
const allSchemas = configValues.map(item => item.schema);

export const ratingPayload = t.Union(allSchemas);

async function getBelkoinRating({ asc, limit, endCursor }: Static<typeof ratingSchema>): Promise<unknown> {
	const direction = getDirection(asc);

	const query = belkoinRatingQuery(playerpoints)

	const result = await executeWithCursorPagination(query, {
		perPage: limit,
		after: endCursor,
		fields: [{
			key: "points", direction, expression: "points"
		}],
		parseCursor: (cursor) => ({ points: Number(cursor.points) }),
	});

	const avatarsMap = await skinsService.players.getAvatar(result.rows.map(r => r.nickname));

	const data = result.rows.map((row) => ({
		kind: "belkoin" as const,
		nickname: row.nickname,
		avatar: avatarsMap[row.nickname],
		balance: row.points
	}))

	return { data, meta: toPageMeta(result) };
}

async function getParkourRating({ asc, limit, endCursor }: Static<typeof ratingSchema>): Promise<unknown> {
	const direction = getDirection(asc);

	const query = parkourRatingQuery(lobby)

	const result = await executeWithCursorPagination(query, {
		perPage: limit,
		after: endCursor,
		fields: [
			{ key: "score", direction, expression: "score" },
			{ key: "player", direction, expression: "player" },
		],
		parseCursor: (cursor) => ({ score: Number(cursor.score), player: cursor.player }),
	});

	const avatarsMap = await skinsService.players.getAvatar(result.rows.map(r => r.nickname!));

	const data = result.rows.map((row) => ({
		kind: "parkour" as const,
		player: row.player ?? "unknown",
		nickname: row.nickname ?? "unknown",
		area: row.area,
		avatar: avatarsMap[row.nickname!],
		gamesplayed: Number(row.gamesplayed ?? 0),
		score: Number(row.score ?? 0)
	}))

	return { data, meta: toPageMeta(result) };
}

async function getLandsRating({ asc, limit, endCursor, server }: Static<typeof ratingSchema>): Promise<unknown> {
	const dbs: Record<string, Kysely<bisquiteDB> | null> = {
		bisquite: bisquite,
		muffin: null,
	};

	const { dbInstance } = getServerDBInstance<bisquiteDB>({ server, dbs });
	const direction = getDirection(asc);

	const landsQuery = landsRatingQuery(dbInstance)

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
					avatar: await skinsService.player.getAvatar(nickname),
					chunks
				})
			}

			const members = Object.fromEntries(membersMap)

			return {
				kind: "lands" as const,
				...row,
				members,
				chunks_amount: Number(row.chunks_amount),
				blocks: row.blocks ? JSON.parse(row.blocks) : null,
			}
		})
	)

	return { data, meta: toPageMeta(landsRes) };
}

async function getCharismRating({ asc, limit, endCursor, server }: Static<typeof ratingSchema>): Promise<unknown> {
	const dbs: Record<string, Kysely<bisquiteDB> | null> = {
		bisquite: bisquite,
		muffin: null,
	};

	const { dbInstance } = getServerDBInstance<bisquiteDB>({ server, dbs });
	const direction = getDirection(asc);

	const query = charismRatingQuery(dbInstance)

	const result = await executeWithCursorPagination(query, {
		perPage: limit,
		after: endCursor,
		fields: [{
			key: "balance", direction, expression: "Balance"
		}],
		parseCursor: (cursor) => ({ balance: Number(cursor.balance) }),
	});

	const avatarsMap = await skinsService.players.getAvatar(result.rows.map(r => r.nickname!));

	const data = result.rows.map((row) => ({
		kind: "charism" as const,
		nickname: row.nickname ?? "unknown",
		balance: Number(row.balance ?? 0),
		avatar: avatarsMap[row.nickname!]
	}))

	return { data, meta: toPageMeta(result) };
}

async function getReputationRating({ asc, limit, endCursor, server }: Static<typeof ratingSchema>): Promise<unknown> {
	const dbs: Record<string, Kysely<reputationDB> | null> = {
		bisquite: reputation,
		muffin: null,
	};

	const { dbInstance } = getServerDBInstance<reputationDB>({ server, dbs });
	const direction = getDirection(asc);

	const query = reputationRatingQuery(dbInstance)

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
				kind: "reputation" as const,
				reputation: row.reputation ?? 0,
				uuid: row.uuid ?? query.uuid,
				avatar: await skinsService.player.getAvatar(nickname),
				nickname,
			};
		}),
	);

	return { data, meta: toPageMeta(result) };
}

async function getPlaytimeRating({ asc, limit, endCursor, server }: Static<typeof ratingSchema>): Promise<unknown> {
	const dbs: Record<string, Kysely<bisquiteDB> | null> = {
		bisquite: bisquite,
		muffin: null,
	};

	const { dbInstance } = getServerDBInstance<bisquiteDB>({ server, dbs });
	const direction = getDirection(asc);

	const query = playtimeRatingQuery(dbInstance)

	const result = await executeWithCursorPagination(query, {
		perPage: limit,
		after: endCursor,
		fields: [{
			key: "total", direction, expression: "TotalPlayTime"
		}],
		parseCursor: (cursor) => ({ total: Number(cursor.total) }),
	});

	const avatarsMap = await skinsService.players.getAvatar(result.rows.map(r => r.nickname!));

	const data = result.rows.map((row) => ({
		kind: "playtime" as const,
		nickname: row.nickname ?? "unknown",
		avatar: avatarsMap[row.nickname!],
		total: Number(row.total ?? 0)
	}))

	return { data, meta: toPageMeta(result) };
}

async function getVotesRating({ asc, limit, endCursor }: Static<typeof ratingSchema>): Promise<unknown> {
	const direction = getDirection(asc);

	const result = await executeWithCursorPagination(votesRatingQuery(general), {
		perPage: limit,
		after: endCursor,
		fields: [
			{ key: "votes", direction, expression: "votes" },
			{ key: "nickname", direction, expression: "nickname" },
		],
		parseCursor: (cursor) => ({ votes: Number(cursor.votes), nickname: cursor.nickname }),
	});

	const avatarsMap = await skinsService.players.getAvatar(result.rows.map((r) => r.nickname ?? ""));

	return {
		data: result.rows.map((row) => ({
			kind: "votes" as const,
			nickname: row.nickname ?? "unknown",
			votes: Number(row.votes ?? 0),
			avatar: avatarsMap[row.nickname ?? ""],
		})),
		meta: toPageMeta(result),
	};
}

async function getReferralsRating({ asc, limit, endCursor }: Static<typeof ratingSchema>): Promise<unknown> {
	const direction = getDirection(asc);

	const result = await executeWithCursorPagination(referralsRatingQuery(general), {
		perPage: limit,
		after: endCursor,
		fields: [
			{ key: "referrals", direction, expression: "referrals" },
			{ key: "nickname", direction, expression: "nickname" },
		],
		parseCursor: (cursor) => ({ referrals: Number(cursor.referrals), nickname: cursor.nickname }),
	});

	const avatarsMap = await skinsService.players.getAvatar(result.rows.map((r) => r.nickname ?? ""));

	return {
		data: result.rows.map((row) => ({
			kind: "referrals" as const,
			nickname: row.nickname ?? "unknown",
			referrals: Number(row.referrals ?? 0),
			avatar: avatarsMap[row.nickname ?? ""],
		})),
		meta: toPageMeta(result),
	};
}

async function getWikiRating({ asc, limit, endCursor }: Static<typeof ratingSchema>): Promise<unknown> {
	const direction = getDirection(asc);

	const result = await executeWithCursorPagination(wikiRatingQuery(general), {
		perPage: limit,
		after: endCursor,
		fields: [
			{ key: "revisions", direction, expression: "revisions" },
			{ key: "nickname", direction, expression: "nickname" },
		],
		parseCursor: (cursor) => ({ revisions: Number(cursor.revisions), nickname: cursor.nickname }),
	});

	const avatarsMap = await skinsService.players.getAvatar(result.rows.map((r) => r.nickname ?? ""));

	return {
		data: result.rows.map((row) => ({
			kind: "wiki" as const,
			nickname: row.nickname ?? "unknown",
			revisions: Number(row.revisions ?? 0),
			avatar: avatarsMap[row.nickname ?? ""],
		})),
		meta: toPageMeta(result),
	};
}

async function getPurchasesRating({ asc, limit, endCursor }: Static<typeof ratingSchema>): Promise<unknown> {
	const direction = getDirection(asc);

	const result = await executeWithCursorPagination(purchasesRatingQuery(general), {
		perPage: limit,
		after: endCursor,
		fields: [
			{ key: "purchases", direction, expression: "purchases" },
			{ key: "nickname", direction, expression: "nickname" },
		],
		parseCursor: (cursor) => ({ purchases: Number(cursor.purchases), nickname: cursor.nickname }),
	});

	const avatarsMap = await skinsService.players.getAvatar(result.rows.map((r) => r.nickname ?? ""));

	return {
		data: result.rows.map((row) => ({
			kind: "purchases" as const,
			nickname: row.nickname ?? "unknown",
			purchases: Number(row.purchases ?? 0),
			avatar: avatarsMap[row.nickname ?? ""],
		})),
		meta: toPageMeta(result),
	};
}

async function getLandsMembersRating({ asc, limit, endCursor, server }: Static<typeof ratingSchema>): Promise<unknown> {
	const dbs: Record<string, Kysely<bisquiteDB> | null> = {
		bisquite: bisquite,
		muffin: null,
	};

	const { dbInstance } = getServerDBInstance<bisquiteDB>({ server, dbs });
	const direction = getDirection(asc);

	const result = await executeWithCursorPagination(landsMembersRatingQuery(dbInstance), {
		perPage: limit,
		after: endCursor,
		fields: [{ key: "members_count", direction, expression: sql<number>`JSON_LENGTH(${sql.ref("members")})` }],
		parseCursor: (cursor) => ({ members_count: Number(cursor.members_count) }),
	});

	return {
		data: result.rows.map((row) => ({
			kind: "lands-members" as const,
			ulid: row.ulid,
			name: row.name,
			members_count: Number(row.members_count ?? 0),
		})),
		meta: toPageMeta(result),
	};
}

export async function getRating(by: AllowedKeys, query: Static<typeof ratingSchema>) {
	try {
		return await ratingConfig[by].fn?.(query)
	} catch (error) {
		// A server that is not launched yet has no database. An empty page is the
		// honest answer; a 500 would only expose the missing instance to players.
		if (error instanceof MissingServerDatabase) {
			return { data: [], meta: toPageMeta({}) };
		}

		throw error;
	}
}

const RATINGS_SECTIONS = {
	global: {
		title: "Глобальные",
		childs: ["parkour", "belkoin", "votes", "wiki", "referrals", "purchases"],
	},
	servers: {
		bisquite: {
			title: "Bisquite",
			childs: ["charism", "playtime", "lands", "lands-members", "reputation"],
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
	votes: "Голоса",
	wiki: "Вики",
	referrals: "Рефералы",
	purchases: "Покупки",
	"lands-members": "Команды земель",
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
