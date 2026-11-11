import { general } from "#/shared/database/general-db";
import { sql } from "kysely";

/** Raw presence rows are kept for 90 days, so ranges beyond that are pointless. */
export const MAX_RANGE_MS = 90 * 24 * 60 * 60 * 1000;
export const DEFAULT_RANGE_MS = 24 * 60 * 60 * 1000;

export type PlayersRange = {
	from: Date;
	to: Date;
	server?: string | null;
};

export type PlayersPoint = {
	at: string;
	joins: number;
	quits: number;
	unique: number;
};

export type PlayersOnline = {
	server: string | null;
	online: number;
};

export type PlayersTotals = {
	joins: number;
	quits: number;
	unique: number;
};

/** Hourly joins/quits and distinct players, for the range chart. */
export async function getPlayersSeries({ from, to, server }: PlayersRange): Promise<PlayersPoint[]> {
	const bucket = sql<string>`date_trunc('hour', "event")`;

	const rows = await general
		.selectFrom("activity_users")
		.select([
			bucket.as("at"),
			sql<number>`count(*) filter (where "type" = 'join')::int`.as("joins"),
			sql<number>`count(*) filter (where "type" = 'quit')::int`.as("quits"),
			sql<number>`count(distinct "nickname")::int`.as("unique"),
		])
		.where("event", ">=", from)
		.where("event", "<", to)
		.$if(!!server, (qb) => qb.where("server", "=", server as string))
		.groupBy(bucket)
		.orderBy(bucket)
		.execute();

	return rows.map((row) => ({
		at: new Date(row.at).toISOString(),
		joins: Number(row.joins),
		quits: Number(row.quits),
		unique: Number(row.unique),
	}));
}

export async function getPlayersTotals({ from, to, server }: PlayersRange): Promise<PlayersTotals> {
	const row = await general
		.selectFrom("activity_users")
		.select([
			sql<number>`count(*) filter (where "type" = 'join')::int`.as("joins"),
			sql<number>`count(*) filter (where "type" = 'quit')::int`.as("quits"),
			sql<number>`count(distinct "nickname")::int`.as("unique"),
		])
		.where("event", ">=", from)
		.where("event", "<", to)
		.$if(!!server, (qb) => qb.where("server", "=", server as string))
		.executeTakeFirst();

	return {
		joins: Number(row?.joins ?? 0),
		quits: Number(row?.quits ?? 0),
		unique: Number(row?.unique ?? 0),
	};
}

/** Players whose last event is a join, grouped by the server they are on. */
export async function getPlayersOnline(): Promise<PlayersOnline[]> {
	const last = general
		.selectFrom("activity_users")
		.select(["nickname", "server", "type"])
		.distinctOn("nickname")
		.orderBy("nickname")
		.orderBy("event", "desc");

	const rows = await general
		.selectFrom(last.as("last"))
		.select(["last.server", sql<number>`count(*)::int`.as("online")])
		.where("last.type", "=", "join")
		.groupBy("last.server")
		.execute();

	return rows
		.map((row) => ({ server: row.server, online: Number(row.online) }))
		.sort((a, b) => (a.server ?? "").localeCompare(b.server ?? ""));
}

export async function getKnownServers(): Promise<string[]> {
	const rows = await general
		.selectFrom("activity_users")
		.select("server")
		.where("server", "is not", null)
		.distinct()
		.orderBy("server")
		.execute();

	return rows.map((row) => row.server).filter((server): server is string => !!server);
}

