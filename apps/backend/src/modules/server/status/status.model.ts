import { invariant } from "#/helpers/invariant";
import { getRedisKey } from "#/helpers/redis";
import { client } from "#/shared/api/client";
import { getUrls } from "#/shared/constants/urls";
import { general } from "#/shared/database/general-db";
import { PANEL_PASSWORD, PANEL_USER } from "#/shared/env";
import { getRedis } from "#/shared/redis/init";
import { logger } from "#/utils/config/logger";
import { safeJsonParse } from "#/utils/config/transforms";
import type { DB } from "@repo/shared/types/db/general-database-types";
import { t } from "elysia";
import type { Selectable } from "kysely";

export const serverSchema = t.Object({
	online: t.Number(),
	fullname: t.String(),
	thumbnail: t.String(),
	max: t.Number(),
	players: t.Array(t.String()),
	status: t.String(),
	available: t.Boolean(),
	description: t.Optional(t.String()),
});

export const statusSchema = t.Object({
	proxy: t.Object({
		status: t.String(),
		online: t.Number(),
		max: t.Number(),
		players: t.Array(t.String()),
	}),
	servers: t.Record(t.String(), serverSchema),
});

export const statusQuerySchema = t.Object({
	q: t.Optional(t.Union([t.Literal("excluded"), t.Literal("all")], { default: "all" })),
});

export type StatusPayload = (typeof statusSchema)["static"];
export type StatusQuery = (typeof statusQuerySchema)["static"];

type Player = {
	username: string;
	uuid: string;
	currentServer: string;
};

const INITIAL_PROXY_DATA: StatusPayload["proxy"] = {
	status: "offline",
	online: 0,
	max: 200,
	players: [],
};

function getClient() {
	const urls = getUrls();
	const panelUrl = urls.get("panel");
	invariant(panelUrl, "Panel url is not defined");
	return client.extend((opts) => ({ ...opts, prefixUrl: `https://${panelUrl}` }));
}

const authHeaders = {
	authorization: `Basic ${btoa(PANEL_USER + ":" + PANEL_PASSWORD)}`,
};

export async function getPlayerStatusGlobal(nickname: string) {
	type PlayerPayload = Player & {
		ping: number;
		sessionDurationSeconds: number;
	};

	const client = getClient();

	const result = await client(`player/${nickname}`, { headers: { ...authHeaders }, timeout: 1000, retry: 1 })
		.json<PlayerPayload>()
		.catch(() => null);

	return result;
}

async function getProxyStats() {
	async function getTarget<T>(path: string): Promise<T | null> {
		return client(path, { headers: { ...authHeaders } })
			.json<T>()
			.catch(() => null);
	}

	const [onlineResult, serversResult, statusResult, playersList] = await Promise.all([
		getTarget<{ count: number }>("count"),
		getTarget<{ [key: string]: number }>("servers"),
		getTarget<{ status: string }>("health"),
		getTarget<{ count: number; players: Player[] }>("playerlist"),
	]);

	return {
		online: onlineResult?.count ?? 0,
		servers: serversResult ?? {},
		status: statusResult?.status ?? "offline",
		playersList: playersList ?? { players: [], count: 0 },
	};
}

const mapServerData = (
	serverName: string,
	onlineCount: number,
	allPlayers: Player[],
	serversData: Selectable<DB["servers"]>[],
) => {
	const nameLower = serverName.toLowerCase();
	const dbData = serversData.find((d) => d.origin === nameLower);

	return [
		nameLower,
		{
			online: onlineCount,
			players: allPlayers.filter((p) => p.currentServer === serverName).map((p) => p.username),
			fullname: dbData?.fullname ?? "unknown",
			thumbnail: dbData?.thumbnail ?? "",
			status: "online",
			max: 200,
			description: dbData?.description,
			available: dbData?.available ?? true,
			excluded: dbData?.excluded ?? false,
		},
	] as const;
};

async function getData() {
	try {
		const [proxyStats, serversData] = await Promise.all([
			getProxyStats(),
			general.selectFrom("servers").selectAll().execute(),
		]);

		if (proxyStats.status !== "ok") {
			return { proxy: INITIAL_PROXY_DATA, servers: {} };
		}

		const serverEntries = Object.entries(proxyStats.servers).map(([name, online]) =>
			mapServerData(name, online, proxyStats.playersList.players, serversData),
		);

		return {
			proxy: {
				status: "online",
				online: proxyStats.playersList.count,
				max: 200,
				players: proxyStats.playersList.players.map((d) => d.username),
			},
			servers: Object.fromEntries(serverEntries),
		};
	} catch (e) {
		logger.error("Failed to update server status", e);
		return null;
	}
}

export async function updateServerStatus() {
	const redis = getRedis();
	const data = await getData();
	await redis.set(SERVER_STATUS_KEY, JSON.stringify(data));
}

const SERVER_STATUS_KEY = getRedisKey("internal", "server-status:data");

export async function getServerStatus({ query }: { query?: StatusQuery }) {
	const redis = getRedis();

	const dataStr = await redis.get(SERVER_STATUS_KEY);
	if (!dataStr) return null;

	const result = safeJsonParse<StatusPayload>(dataStr);
	if (!result.ok) return null;

	const data = result.value;

	if (query?.q === "excluded") {
		return {
			...data,
			servers: Object.fromEntries(
				// @ts-expect-error
				Object.entries(data.servers).filter(([_, s]) => !s.excluded),
			),
		};
	}

	return data;
}
