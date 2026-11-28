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
	uuid: string | null;
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
		const inserted = await trx
			.insertInto("playtime_reports")
			.values({
				id: report.id,
				session_id: report.sessionId,
				uuid: report.uuid,
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
				lower_nickname: lowerNickname,
				nickname: report.nickname,
				server: report.server,
				seconds: report.seconds,
			})
			.onConflict((oc) =>
				oc.columns(["lower_nickname", "server"]).doUpdateSet({
					nickname: report.nickname,
					updated_at: new Date(),
					seconds: sql`"player_playtime"."seconds" + ${report.seconds}`,
				})
			)
			.execute();

		return true;
	});
}

/** Total playtime in seconds across the requested nicknames. */
export async function getPlaytimeSeconds(nicknames: string[]): Promise<Map<string, number>> {
	const lowered = [...new Set(nicknames.map((nickname) => nickname.toLowerCase()))];
	if (lowered.length === 0) return new Map();

	const rows = await general
		.selectFrom("player_playtime")
		.select(["lower_nickname"])
		.select(sql<number>`sum("seconds")`.as("total"))
		.where("lower_nickname", "in", lowered)
		.groupBy("lower_nickname")
		.execute();

	return new Map(rows.map((row) => [row.lower_nickname, Number(row.total ?? 0)]));
}
