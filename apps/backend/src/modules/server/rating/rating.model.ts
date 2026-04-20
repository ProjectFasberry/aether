import { bisquite } from "#/shared/database/bisquite-db";
import { lobby } from "#/shared/database/lobby-db";
import { playerpoints } from "#/shared/database/playerpoints-db";
import { reputation } from "#/shared/database/reputation-db";
import { metaSchema } from "#/shared/schemas";
import { getDirection } from "#/utils/config/paginate";
import { wrapMeta } from "#/utils/config/transforms";
import type { DB as bisquiteDB } from "@repo/shared/types/db/bisquite-database-types";
import type { Kysely } from "kysely";
import { executeWithCursorPagination } from "kysely-paginate";
import * as z from "zod/v4";
import type { DB as reputationDB } from "@repo/shared/types/db/reputation-database-types";

export const ratingSchema = z.intersection(
	metaSchema.pick({ asc: true, limit: true, endCursor: true }),
	z.object({
		server: z.string().min(1).optional(),
	}),
);

async function getBelkoinRating({ asc, limit, endCursor }: z.infer<typeof ratingSchema>) {
	const direction = getDirection(asc);

	const belkoinQuery = playerpoints
		.selectFrom("playerpoints_points")
		.innerJoin("playerpoints_username_cache", "playerpoints_points.uuid", "playerpoints_username_cache.uuid")
		.select(["playerpoints_points.points", "playerpoints_username_cache.username as nickname"]);

	const belkoinRes = await executeWithCursorPagination(belkoinQuery, {
		perPage: limit,
		after: endCursor,
		fields: [{ key: "points", direction, expression: "points" }],
		parseCursor: (cursor) => ({ points: Number(cursor.points) }),
	});

	return {
		data: belkoinRes.rows.map((d) => ({ nickname: d.nickname, balance: d.points })),
		meta: wrapMeta(belkoinRes),
	};
}

async function getParkourRating({ asc, limit, endCursor }: z.infer<typeof ratingSchema>) {
	const direction = getDirection(asc);

	const parkourQuery = lobby
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

	const parkourRes = await executeWithCursorPagination(parkourQuery, {
		perPage: limit,
		after: endCursor,
		fields: [{ key: "score", direction, expression: "score" }],
		parseCursor: (cursor) => ({ score: Number(cursor.score) }),
	});

	return {
		data: parkourRes.rows,
		meta: wrapMeta(parkourRes),
	};
}

async function getLandsRating({ asc, limit, endCursor, server }: z.infer<typeof ratingSchema>) {
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
		fields: [{ key: "chunks_amount", direction, expression: "chunks_amount" }],
		parseCursor: (cursor) => ({ chunks_amount: Number(cursor.chunks_amount) }),
	});

	landsRes.rows = landsRes.rows.map((item) => {
		return {
			...item,
			members: JSON.parse(item.members),
			chunks_amount: Number(item.chunks_amount),
			blocks: item.blocks ? JSON.parse(item.blocks) : null,
		};
	});

	return {
		data: landsRes.rows,
		meta: wrapMeta(landsRes),
	};
}

async function getCharismRating({ asc, limit, endCursor, server }: z.infer<typeof ratingSchema>) {
	const dbs: Record<string, Kysely<bisquiteDB> | null> = {
		bisquite: bisquite,
		muffin: null,
	};

	const { dbInstance } = getServerDBInstance<bisquiteDB>({ server, dbs });

	const direction = getDirection(asc);

	const charismQuery = dbInstance.selectFrom("cmi_users").select(["Balance as balance", "username as nickname"]);

	const charismRes = await executeWithCursorPagination(charismQuery, {
		perPage: limit,
		after: endCursor,
		fields: [{ key: "balance", direction, expression: "Balance" }],
		parseCursor: (cursor) => ({ balance: Number(cursor.balance) }),
	});

	return {
		data: charismRes.rows,
		meta: wrapMeta(charismRes),
	};
}

async function getReputationRating({ asc, limit, endCursor, server }: z.infer<typeof ratingSchema>) {
	const dbs: Record<string, Kysely<reputationDB> | null> = {
		bisquite: reputation,
		muffin: null,
	};

	const { dbInstance } = getServerDBInstance<reputationDB>({ server, dbs });

	const direction = getDirection(asc);

	const reputationQuery = dbInstance.selectFrom("reputation").select(["reputation", "reputation.uuid"]);

	const reputationRes = await executeWithCursorPagination(reputationQuery, {
		perPage: limit,
		after: endCursor,
		fields: [{ key: "reputation", direction, expression: "reputation" }],
		parseCursor: (cursor) => ({ reputation: Number(cursor.reputation) }),
	});

	const result = await Promise.all(
		reputationRes.rows.map(async (row) => {
			const { nickname, uuid } = await bisquite
				.selectFrom("cmi_users")
				.select(["username as nickname", "player_uuid as uuid"])
				.where("player_uuid", "=", row.uuid)
				.executeTakeFirstOrThrow();

			return {
				reputation: row.reputation ?? 0,
				uuid: row.uuid ?? uuid,
				nickname: nickname as string,
			};
		}),
	);

	return {
		data: result,
		meta: wrapMeta(reputationRes),
	};
}

function getServerDBInstance<T>({ server, dbs }: { server?: string; dbs: Record<string, Kysely<T> | null> }) {
	if (!server) {
		throw new Error("Server is not defined");
	}

	const dbInstance = dbs[server];
	if (!dbInstance) {
		throw new Error("Target db instance is not defined");
	}

	return { dbInstance };
}

async function getPlaytimeRating({ asc, limit, endCursor, server }: z.infer<typeof ratingSchema>) {
	const dbs: Record<string, Kysely<bisquiteDB> | null> = {
		bisquite: bisquite,
		muffin: null,
	};

	const { dbInstance } = getServerDBInstance<bisquiteDB>({ server, dbs });

	const direction = getDirection(asc);

	const playtimeQuery = dbInstance.selectFrom("cmi_users").select(["TotalPlayTime as total", "username as nickname"]);

	const playtimeRes = await executeWithCursorPagination(playtimeQuery, {
		perPage: limit,
		after: endCursor,
		fields: [{ key: "total", direction, expression: "TotalPlayTime" }],
		parseCursor: (cursor) => ({ total: Number(cursor.total) }),
	});

	return {
		data: playtimeRes.rows,
		meta: wrapMeta(playtimeRes),
	};
}

const ratingFunctions = {
	reputation: getReputationRating,
	belkoin: getBelkoinRating,
	charism: getCharismRating,
	playtime: getPlaytimeRating,
	lands_chunks: getLandsRating,
	parkour: getParkourRating,
} as const;

type ExtractData<T> = T extends (...args: any[]) => Promise<infer R> ? R : never;

type EventsRecord = {
	[K in keyof typeof ratingFunctions]: (
		q: Parameters<(typeof ratingFunctions)[K]>[0],
	) => Promise<ExtractData<(typeof ratingFunctions)[K]>>;
};

export const events: EventsRecord = ratingFunctions;

const RATINGS_SECTIONS = {
	global: {
		title: "Глобальные",
		childs: ["parkour", "belkoin"],
	},
	servers: {
		bisquite: {
			title: "Bisquite",
			childs: ["charism", "playtime", "lands_chunks", "reputation"],
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
	lands_chunks: "Территории",
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
