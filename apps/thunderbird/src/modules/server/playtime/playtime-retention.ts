import { sql } from "kysely";
import { general } from "#/shared/database/general-db";

/**
 * Report ids only guard against a retry after a reconnect; the plugin publishes
 * a fresh id every five minutes, so a month of history is plenty.
 */
export const PLAYTIME_REPORT_RETENTION_DAYS = 30;

export async function cleanOldPlaytimeReports(): Promise<number> {
	const result = await general
		.deleteFrom("playtime_reports")
		.where("received_at", "<", sql<Date>`now() - make_interval(days => ${PLAYTIME_REPORT_RETENTION_DAYS})`)
		.executeTakeFirst();

	return Number(result.numDeletedRows ?? 0);
}
