import { general } from "#/shared/database/general-db";
import { sql } from "kysely";

/** Raw presence rows feed the charts; 90 days is the agreed window. */
export const ACTIVITY_RETENTION_DAYS = 90;

export async function cleanOldActivity(): Promise<number> {
	const result = await general
		.deleteFrom("activity_users")
		.where("event", "<", sql<Date>`now() - make_interval(days => ${ACTIVITY_RETENTION_DAYS})`)
		.executeTakeFirst();

	return Number(result.numDeletedRows ?? 0);
}
