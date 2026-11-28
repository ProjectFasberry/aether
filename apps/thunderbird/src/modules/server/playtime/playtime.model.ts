import { sql } from "kysely";
import { general } from "#/shared/database/general-db";

/**
 * One active playtime increment from a backend. `id` is generated per publish:
 * the API stores it once and adds `seconds` to the per-server counter, so a
 * retry after a reconnect cannot double-count. `sessionId` groups the reports
 * of one join for audits.
 */
export type PlaytimeReport = {
	id: string;
	sessionId: string;
	uuid: string;
	nickname: string;
	server: string;
	seconds: number;
};

/** A single report is at most a long session; anything bigger is a bug. */
export const MAX_PLAYTIME_REPORT_SECONDS = 6 * 60 * 60;

export async function ingestPlaytimeReport(report: PlaytimeReport): Promise<boolean> {
	if (report.seconds <= 0 || report.seconds > MAX_PLAYTIME_REPORT_SECONDS) {
		throw new Error(`Invalid playtime report: ${report.seconds}s`);
	}

	const lowerNickname = report.nickname.toLowerCase();

	return general.transaction().execute(async (trx) => {
		// The account UUID wins over the one in the report: a legacy CMI row can
		// carry a premium UUID while the project registered the offline one.
		const account = await trx
			.selectFrom("players")
			.select("uuid")
			.where("lower_case_nickname", "=", lowerNickname)
			.executeTakeFirst();

		const uuid = account?.uuid ?? report.uuid;

		const inserted = await trx
			.insertInto("playtime_reports")
			.values({
				id: report.id,
				session_id: report.sessionId,
				uuid,
				lower_nickname: lowerNickname,
				nickname: report.nickname,
				server: report.server,
				seconds: report.seconds,
			})
			.onConflict((oc) => oc.column("id").doNothing())
			.returning("id")
			.executeTakeFirst();

		if (!inserted) return false;

		await trx
			.insertInto("player_playtime")
			.values({
				uuid,
				lower_nickname: lowerNickname,
				nickname: report.nickname,
				server: report.server,
				seconds: report.seconds,
			})
			.onConflict((oc) =>
				oc.columns(["uuid", "server"]).doUpdateSet({
					lower_nickname: lowerNickname,
					nickname: report.nickname,
					updated_at: new Date(),
					seconds: sql`"player_playtime"."seconds" + ${report.seconds}`,
				})
			)
			.execute();

		return true;
	});
}

/**
 * Total playtime in seconds across the requested nicknames. Known players are
 * resolved to their account UUID; legacy CMI-only rows that have no account
 * fall back to the stored lowercase nickname.
 */
export async function getPlaytimeSeconds(nicknames: string[]): Promise<Map<string, number>> {
	const lowered = [...new Set(nicknames.map((nickname) => nickname.toLowerCase()))];
	if (lowered.length === 0) return new Map();

	const accounts = await general
		.selectFrom("players")
		.select(["uuid", "lower_case_nickname"])
		.where("lower_case_nickname", "in", lowered)
		.execute();

	const uuidByNickname = new Map(accounts.map((row) => [row.lower_case_nickname, row.uuid]));
	const result = new Map<string, number>();

	if (accounts.length > 0) {
		const rows = await general
			.selectFrom("player_playtime")
			.select("uuid")
			.select(sql<number>`sum("seconds")`.as("total"))
			.where("uuid", "in", accounts.map((row) => row.uuid))
			.groupBy("uuid")
			.execute();

		const byUuid = new Map(rows.map((row) => [row.uuid, Number(row.total ?? 0)]));

		for (const [nickname, uuid] of uuidByNickname) {
			result.set(nickname, byUuid.get(uuid) ?? 0);
		}
	}

	const missing = lowered.filter((nickname) => !uuidByNickname.has(nickname));

	if (missing.length > 0) {
		const rows = await general
			.selectFrom("player_playtime")
			.select(["lower_nickname"])
			.select(sql<number>`sum("seconds")`.as("total"))
			.where("lower_nickname", "in", missing)
			.groupBy("lower_nickname")
			.execute();

		for (const row of rows) {
			result.set(row.lower_nickname, Number(row.total ?? 0));
		}
	}

	return new Map(lowered.map((nickname) => [nickname, result.get(nickname) ?? 0]));
}
