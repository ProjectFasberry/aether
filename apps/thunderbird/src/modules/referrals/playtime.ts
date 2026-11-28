import { sql, type Kysely } from "kysely";
import type { DB as BisquiteDB } from "@gen/db/bisquite";
import { bisquite } from "#/shared/database/bisquite-db";
import { general } from "#/shared/database/general-db";
import { sumSessionMs, type ActivityRow } from "#/modules/server/activity/activity-sessions";

/**
 * Playtime has two sources with different scopes:
 *
 * - CMI stores a lifetime counter per server, and only MySQL-backed servers are
 *   readable from the API (`bisquite` today, `muffin` once it has its own URI).
 * - The proxy sees every connection on the network and writes join/quit rows to
 *   `activity_users`, so session time covers every backend, including the ones
 *   that keep CMI in a local SQLite file.
 *
 * Neither source is enough alone: CMI is lifetime but per server, the proxy is
 * network-wide but only as old as the presence tracking. Taking the larger of
 * the two avoids double counting (both include Bisquite) while never
 * undercounting a multi-server player.
 */
const ACTIVITY_WINDOW_DAYS = 365;

const CMI_DATABASES: Array<{ name: string; db: Kysely<BisquiteDB> }> = [
	{ name: "bisquite", db: bisquite },
];

export type PlaytimeByNickname = Map<string, number>;

async function proxyPlaytime(nicknames: string[]): Promise<PlaytimeByNickname> {
	if (nicknames.length === 0) return new Map();

	const rows = await general
		.selectFrom("activity_users")
		.select(["nickname", "event", "type", "session"])
		.where(sql`lower("nickname")`, "in", nicknames)
		.where("event", ">=", sql<Date>`now() - make_interval(days => ${ACTIVITY_WINDOW_DAYS})`)
		.orderBy("event", "asc")
		.execute();

	const grouped = new Map<string, ActivityRow[]>();

	for (const row of rows) {
		const key = row.nickname.toLowerCase();
		const bucket = grouped.get(key) ?? [];

		bucket.push({ event: row.event, type: row.type, session: row.session });
		grouped.set(key, bucket);
	}

	const now = new Date();
	const result: PlaytimeByNickname = new Map();

	for (const [nickname, bucket] of grouped) {
		result.set(nickname, sumSessionMs(bucket, now));
	}

	return result;
}

async function cmiPlaytime(nicknames: string[]): Promise<PlaytimeByNickname> {
	if (nicknames.length === 0) return new Map();

	const result: PlaytimeByNickname = new Map();

	for (const source of CMI_DATABASES) {
		const rows = await source.db
			.selectFrom("cmi_users")
			.select(["username", "TotalPlayTime"])
			.where(sql`lower("username")`, "in", nicknames)
			.execute();

		for (const row of rows) {
			if (!row.username) continue;

			const key = row.username.toLowerCase();
			const playtime = Number(row.TotalPlayTime ?? 0);

			// A player can exist on several servers; CMI counters are additive.
			result.set(key, (result.get(key) ?? 0) + playtime);
		}
	}

	return result;
}

/**
 * Network playtime in milliseconds, keyed by the lowercased nickname.
 * The result is always present for every requested nickname.
 */
export async function getNetworkPlaytime(nicknames: string[]): Promise<PlaytimeByNickname> {
	const lowered = [...new Set(nicknames.map((nickname) => nickname.toLowerCase()))];

	const [proxy, cmi] = await Promise.all([proxyPlaytime(lowered), cmiPlaytime(lowered)]);
	const result: PlaytimeByNickname = new Map();

	for (const nickname of lowered) {
		result.set(nickname, Math.max(proxy.get(nickname) ?? 0, cmi.get(nickname) ?? 0));
	}

	return result;
}
