import { getRedisKey } from "#/helpers/redis";
import { bisquite } from "#/shared/database/bisquite-db";
import { general } from "#/shared/database/general-db";
import { getRedis } from "#/shared/redis/client";
import { safeJsonParse } from "#/utils/config/transforms";
import type { SeemsLikePlayer, SeemsLikePlayersPayload } from "@repo/shared/types/entities/other";
import { isProduction } from "elysia/error";
import { sql } from "kysely";
import pLimit from "p-limit";
import * as z from "zod/v4";
import { getPlayerAvatar } from "../server/skin/skin.model";

export const SEEMS_LIKE_LAST_UPDATE_KEY = (nickname: string) =>
	getRedisKey("internal", `seems-like:last-update:${nickname}:data`);
export const SEEMS_LIKE_LIST_KEY = (nickname: string) => getRedisKey("internal", `seems-like:list:${nickname}:data`);

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const TTL_MS = SIX_HOURS_MS;
const LIMIT = 32;

export async function updateSeemsLikeList() {
	const redis = getRedis();
	const BATCH_SIZE = 100;
	const CONCURRENCY = 16;
	const limit = pLimit(CONCURRENCY);

	const players = await general.selectFrom("players").select(["nickname", "uuid"]).limit(1000).execute();

	if (players.length === 0) {
		return;
	}

	const start = Date.now();
	const candidates: { nickname: string; uuid: string }[] = [];

	const pipeline = redis.multi();

	for (const p of players) {
		pipeline.get(SEEMS_LIKE_LAST_UPDATE_KEY(p.nickname));
	}

	const results = await pipeline.exec();
	if (!results) return;

	results.forEach((res, i) => {
		const [, value] = res as [Error | null, string | null];

		const ts = Number(value ?? 0);

		if (!value || Number.isNaN(ts) || start - ts > SIX_HOURS_MS) {
			candidates.push(players[i]);
		}
	});

	if (candidates.length === 0) {
		return;
	}

	if (!isProduction) {
		console.log(`Updating ${candidates.length} players`);
	}

	let successCount = 0;
	let errorCount = 0;

	async function processBatch(batch: { nickname: string; uuid: string }[], index: number) {
		const batchStart = Date.now();

		const batchResult = await processSeemsLikePlayersBatch(batch);

		await Promise.all(
			batch.map((player) =>
				limit(async () => {
					try {
						const data = batchResult[player.nickname];
						const multi = redis.multi();

						multi.set(SEEMS_LIKE_LIST_KEY(player.nickname), JSON.stringify(data), "PX", TTL_MS);
						multi.set(SEEMS_LIKE_LAST_UPDATE_KEY(player.nickname), Date.now().toString(), "PX", TTL_MS);

						await multi.exec();

						successCount++;

						if (!isProduction) {
							console.log(`${player.nickname} updated (${successCount}/${candidates.length})`);
						}
					} catch (err) {
						errorCount++;
						console.error(`Error: ${player.nickname}:`, err);
					}
				}),
			),
		);
	}

	for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
		const batch = candidates.slice(i, i + BATCH_SIZE);
		await processBatch(batch, i / BATCH_SIZE);
		await new Promise((res) => setTimeout(res, 500));
	}
}

async function getRandomPlayers(limit: number) {
	return general
		.selectFrom("players")
		.select(["nickname", "uuid"])
		.orderBy(sql`RANDOM()`)
		.limit(limit)
		.execute();
}

type RawSeemsLikePlayer = Omit<SeemsLikePlayer, "avatar">

export async function processSeemsLikePlayersBatch(
	batch: { nickname: string; uuid: string }[],
): Promise<Record<string, RawSeemsLikePlayer[]>> {
	const batchNicknames = batch.map((p) => p.nickname);

	const lands = await bisquite
		.selectFrom("lands_lands")
		.innerJoin("lands_players", "lands_players.edit_land", "lands_lands.ulid")
		.select(["lands_lands.ulid", "lands_lands.members", "lands_players.name as player_name"])
		.where("lands_players.name", "in", batchNicknames)
		.orderBy("lands_lands.created_at", "asc")
		.execute();

	const playerToMembersMap: Record<string, Set<string>> = {};

	for (const { ulid, members } of lands) {
		type Members = Record<string, { chunks: number }>;

		if (!playerToMembersMap[ulid]) {
			playerToMembersMap[ulid] = new Set();
		}

		const parsedMembers = safeJsonParse<Members>(members);

		if (parsedMembers.ok) {
			for (const [memberUUID, _] of Object.entries(parsedMembers.value)) {
				if (memberUUID !== ulid) {
					playerToMembersMap[ulid].add(memberUUID);
				}
			}
		} else {
			console.error(parsedMembers.error.message)
		}
	}

	const allMembersSet = new Set<string>();

	Object.values(playerToMembersMap).forEach((set) => {
		set.forEach((name) => {
			allMembersSet.add(name);
		});
	});

	const allMembers = Array.from(allMembersSet);

	type FullPlayer = { nickname: string; uuid: string; role_id?: number };

	const fullPlayersMap: Record<string, FullPlayer> = {};

	if (allMembers.length > 0) {
		const fullPlayers = await general
			.selectFrom("players")
			.select(["nickname", "uuid", "role_id"])
			.where("uuid", "in", allMembers)
			.orderBy("role_id", "desc")
			.execute();

		fullPlayers.forEach((p) => {
			fullPlayersMap[p.nickname] = p;
		});
	}
	
	const result: Record<string, RawSeemsLikePlayer[]> = {};

	for (const player of batch) {
		const data: RawSeemsLikePlayer[] = [];
		const members = playerToMembersMap[player.nickname] ?? new Set();

		members.delete(player.nickname);

		let count = 0;

		const med = Math.log2(lands.filter((l) => l.player_name === player.nickname).length + 1) / 3;
		const seemsRate = Math.min(1, med);

		for (const name of members) {
			const player = fullPlayersMap[name];

			const { nickname, uuid } = player;

			if (player && count < LIMIT) {
				data.push({ nickname, uuid, seemsRate });
				count++;
			}
		}

		if (data.length === 0) {
			const randomPlayers = await getRandomPlayers(LIMIT + 1);

			for (const p of randomPlayers) {
				if (p.nickname === player.nickname) {
					continue;
				}

				data.push({ nickname: p.nickname, uuid: p.uuid, seemsRate: 0.1 });

				if (data.length >= LIMIT) {
					break;
				}
			}
		}

		result[player.nickname] = data;
	}

	return result;
}

export async function getSeemsLikePlayersByPlayer(
	nickname: string,
	{ limit }: z.infer<typeof seemsPlayersSchema>,
): Promise<SeemsLikePlayersPayload> {
	const redis = getRedis();

	const dataStr = await redis.get(SEEMS_LIKE_LIST_KEY(nickname));

	if (!dataStr)
		return {
			data: [],
			meta: { count: 0 },
		};

	const result = safeJsonParse<SeemsLikePlayer[]>(dataStr);

	if (!result.ok) {
		console.error(result.error.message);

		return {
			data: [],
			meta: { count: 0 },
		};
	}

	let data = result.value.filter((d) => d.nickname !== nickname);

	if (limit) {
		data = data.slice(0, limit);
	}

	data = await Promise.all(
		data.map(async (row) => ({
			...row,
			avatar: await getPlayerAvatar(row.nickname)
		}))
	)

	return {
		data,
		meta: {
			count: data.length,
		},
	};
}

export const seemsPlayersSchema = z.object({
	limit: z.coerce.number().optional(),
});
