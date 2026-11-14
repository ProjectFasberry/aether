import { getRedisKey } from "#/helpers/redis";
import { bisquite } from "#/shared/database/bisquite-db";
import { general } from "#/shared/database/general-db";
import { redisService } from "#/shared/redis/client";
import { isProduction } from "elysia/error";
import { sql } from "kysely";
import pLimit from "p-limit";
import * as z from "zod";
import { skinsService } from "../../shared/services/skins";
import { safeJsonParse } from "#/utils";
import { logger } from "@repo/shared/utils/logger";

export type SeemsLikePlayer = {
	nickname: string;
	uuid: string;
	seemsRate: number;
	avatar: string;
};

export type SeemsLikePlayersPayload = {
	data: SeemsLikePlayer[];
	meta: {
		count: number;
	};
};

/** Bumped when the cached payload or the key layout changes. */
const CACHE_VERSION = "v2";

export const SEEMS_LIKE_LAST_UPDATE_KEY = (nickname: string) =>
	getRedisKey("internal", `seems-like:${CACHE_VERSION}:last-update:${nickname.toLowerCase()}:data`);
export const SEEMS_LIKE_LIST_KEY = (nickname: string) =>
	getRedisKey("internal", `seems-like:${CACHE_VERSION}:list:${nickname.toLowerCase()}:data`);

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const TTL_MS = SIX_HOURS_MS;
const LIMIT = 32;
const PLAYER_PAGE_SIZE = 1000;
const BATCH_SIZE = 100;
const CONCURRENCY = 16;

type BatchPlayer = { nickname: string; uuid: string };
type RawSeemsLikePlayer = Omit<SeemsLikePlayer, "avatar">;
type LandMembers = Record<string, { chunks: number }>;
type FullPlayer = { nickname: string; uuid: string; role_id?: number };

/**
 * The list is rebuilt for one player on a cache miss, so a new player does not
 * have to wait for the next cron tick. Concurrent requests share one lookup.
 */
const inflight = new Map<string, Promise<RawSeemsLikePlayer[]>>();

async function getRandomPlayers(limit: number, excludeUuid: string) {
	return general
		.selectFrom("players")
		.select(["nickname", "uuid"])
		.where("uuid", "!=", excludeUuid)
		.orderBy(sql`RANDOM()`)
		.limit(limit)
		.execute();
}

/**
 * Builds "seems like" candidates from the members of the player's lands. A
 * player with no lands, or with no known co-members, gets a random fallback so
 * the block is never empty for a normal account.
 */
export async function processSeemsLikePlayersBatch(
	batch: BatchPlayer[],
): Promise<Record<string, RawSeemsLikePlayer[]>> {
	if (batch.length === 0) return {};

	const batchByUuid = new Map(batch.map((player) => [player.uuid, player]));

	const lands = await bisquite
		.selectFrom("lands_lands")
		.select(["ulid", "members"])
		.where((eb) =>
			eb.or(batch.map((player) => eb("lands_lands.members", "like", `%${player.uuid}%`))),
		)
		.orderBy("lands_lands.created_at", "asc")
		.execute();

	const playerToMembers = new Map<string, Set<string>>();
	const playerLandCounts = new Map<string, number>();

	for (const land of lands) {
		const parsedMembers = safeJsonParse<LandMembers>(land.members);

		if (!parsedMembers.ok) {
			logger.error(parsedMembers.error.message);
			continue;
		}

		const memberUuids = Object.keys(parsedMembers.value);

		for (const memberUuid of memberUuids) {
			if (!batchByUuid.has(memberUuid)) continue;

			playerLandCounts.set(memberUuid, (playerLandCounts.get(memberUuid) ?? 0) + 1);

			let peers = playerToMembers.get(memberUuid);
			if (!peers) {
				peers = new Set();
				playerToMembers.set(memberUuid, peers);
			}

			for (const peerUuid of memberUuids) {
				if (peerUuid !== memberUuid) peers.add(peerUuid);
			}
		}
	}

	const allMemberUuids = new Set<string>();
	for (const peers of playerToMembers.values()) {
		for (const uuid of peers) allMemberUuids.add(uuid);
	}

	const fullPlayers = allMemberUuids.size > 0
		? await general
			.selectFrom("players")
			.select(["nickname", "uuid", "role_id"])
			.where("uuid", "in", Array.from(allMemberUuids))
			.orderBy("role_id", "desc")
			.execute()
		: [];

	const playersByUuid = new Map(fullPlayers.map((player) => [player.uuid, player]));
	const result: Record<string, RawSeemsLikePlayer[]> = {};

	for (const player of batch) {
		const data: RawSeemsLikePlayer[] = [];
		const seen = new Set<string>();
		const peers = playerToMembers.get(player.uuid) ?? new Set<string>();
		const landCount = playerLandCounts.get(player.uuid) ?? 0;
		const seemsRate = Math.min(1, Math.log2(landCount + 1) / 3);

		for (const peerUuid of peers) {
			if (peerUuid === player.uuid || seen.has(peerUuid)) continue;

			const peer = playersByUuid.get(peerUuid);
			if (!peer) continue;

			seen.add(peerUuid);
			data.push({ nickname: peer.nickname, uuid: peer.uuid, seemsRate });

			if (data.length >= LIMIT) break;
		}

		if (data.length === 0) {
			const randomPlayers = await getRandomPlayers(LIMIT, player.uuid);

			for (const randomPlayer of randomPlayers) {
				if (randomPlayer.uuid === player.uuid || seen.has(randomPlayer.uuid)) continue;

				seen.add(randomPlayer.uuid);
				data.push({
					nickname: randomPlayer.nickname,
					uuid: randomPlayer.uuid,
					seemsRate: 0.1,
				});

				if (data.length >= LIMIT) break;
			}
		}

		result[player.nickname] = data;
	}

	return result;
}

async function getStalePlayers(
	redisClient: ReturnType<typeof redisService.getInstance>,
	players: BatchPlayer[],
	now: number,
): Promise<BatchPlayer[]> {
	const pipeline = redisClient.multi();

	for (const player of players) {
		pipeline.get(SEEMS_LIKE_LAST_UPDATE_KEY(player.nickname));
	}

	const results = await pipeline.exec();
	if (!results) return [];

	const candidates: BatchPlayer[] = [];

	results.forEach((entry, index) => {
		const [, value] = entry as [Error | null, string | null];
		const timestamp = Number(value ?? 0);

		if (!value || !Number.isFinite(timestamp) || now - timestamp > SIX_HOURS_MS) {
			candidates.push(players[index]);
		}
	});

	return candidates;
}

export async function updateSeemsLikeList() {
	const redisClient = redisService.getInstance();
	const limit = pLimit(CONCURRENCY);
	const startedAt = Date.now();

	let lastNickname = "";
	let total = 0;
	let successCount = 0;
	let errorCount = 0;

	while (true) {
		const players = await general
			.selectFrom("players")
			.select(["nickname", "uuid"])
			.where("nickname", ">", lastNickname)
			.orderBy("nickname", "asc")
			.limit(PLAYER_PAGE_SIZE)
			.execute();

		if (players.length === 0) break;

		lastNickname = players[players.length - 1].nickname;
		total += players.length;

		const candidates = await getStalePlayers(redisClient, players, startedAt);
		if (candidates.length === 0) continue;

		if (!isProduction) {
			logger.debug(`Updating ${candidates.length} seems-like players`);
		}

		for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
			const batch = candidates.slice(i, i + BATCH_SIZE);

			try {
				const batchResult = await processSeemsLikePlayersBatch(batch);

				await Promise.all(
					batch.map((player) =>
						limit(async () => {
							try {
								const data = batchResult[player.nickname] ?? [];
								const multi = redisClient.multi();

								multi.set(SEEMS_LIKE_LIST_KEY(player.nickname), JSON.stringify(data), "PX", TTL_MS);
								multi.set(SEEMS_LIKE_LAST_UPDATE_KEY(player.nickname), Date.now().toString(), "PX", TTL_MS);

								await multi.exec();
								successCount++;
							} catch (error) {
								errorCount++;
								logger.error({ message: "seems-like cache write failed", nickname: player.nickname, error });
							}
						}),
					),
				);
			} catch (error) {
				errorCount += batch.length;
				logger.error({ message: "seems-like batch failed", error });
			}

			await new Promise((resolve) => setTimeout(resolve, 500));
		}
	}

	logger.info({
		message: "seems-like update finished",
		total,
		successCount,
		errorCount,
		durationMs: Date.now() - startedAt,
	});
}

async function computeSeemsLikeList(nickname: string): Promise<RawSeemsLikePlayer[]> {
	const key = nickname.toLowerCase();
	const existing = inflight.get(key);
	if (existing) return existing;

	const promise = (async () => {
		const player = await general
			.selectFrom("players")
			.select(["nickname", "uuid"])
			.where(sql`lower(players.nickname)`, "=", key)
			.executeTakeFirst();

		if (!player) return [];

		const batchResult = await processSeemsLikePlayersBatch([player]);

		return batchResult[player.nickname] ?? [];
	})().finally(() => {
		inflight.delete(key);
	});

	inflight.set(key, promise);

	return promise;
}

async function readCachedSeemsLikeList(nickname: string): Promise<RawSeemsLikePlayer[] | null> {
	const redisClient = redisService.getInstance();
	const dataStr = await redisClient.get(SEEMS_LIKE_LIST_KEY(nickname));

	if (!dataStr) return null;

	const result = safeJsonParse<RawSeemsLikePlayer[]>(dataStr);

	if (!result.ok) {
		logger.error(result.error.message);
		return null;
	}

	return result.value;
}

async function writeCachedSeemsLikeList(nickname: string, data: RawSeemsLikePlayer[]): Promise<void> {
	const redisClient = redisService.getInstance();
	const multi = redisClient.multi();

	multi.set(SEEMS_LIKE_LIST_KEY(nickname), JSON.stringify(data), "PX", TTL_MS);
	multi.set(SEEMS_LIKE_LAST_UPDATE_KEY(nickname), Date.now().toString(), "PX", TTL_MS);

	await multi.exec();
}

export async function getSeemsLikePlayersByPlayer(
	nickname: string,
	{ limit }: z.infer<typeof seemsPlayersSchema>,
): Promise<SeemsLikePlayersPayload> {
	let data = await readCachedSeemsLikeList(nickname);

	if (!data) {
		data = await computeSeemsLikeList(nickname);

		if (data.length > 0) {
			await writeCachedSeemsLikeList(nickname, data);
		}
	}

	const normalizedNickname = nickname.toLowerCase();
	const take = Math.min(Math.max(limit ?? LIMIT, 1), LIMIT);

	data = data
		.filter((entry) => entry.nickname.toLowerCase() !== normalizedNickname)
		.slice(0, take);

	const avatarsMap = await skinsService.players.getAvatar(data.map((entry) => entry.nickname));

	const payload = data.map((entry) => ({
		...entry,
		avatar: avatarsMap[entry.nickname],
	}));

	return {
		data: payload,
		meta: {
			count: payload.length,
		},
	};
}

export const seemsPlayersSchema = z.object({
	limit: z.coerce.number().int().min(1).max(LIMIT).optional(),
});
