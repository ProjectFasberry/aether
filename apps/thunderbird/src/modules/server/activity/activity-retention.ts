import { general } from "#/shared/database/general-db";
import { sql } from "kysely";

/** Raw presence rows feed the yearly activity chart. */
export const ACTIVITY_RETENTION_DAYS = 365;

export async function cleanOldActivity(): Promise<number> {
	const result = await general
		.deleteFrom("activity_users")
		.where("event", "<", sql<Date>`now() - make_interval(days => ${ACTIVITY_RETENTION_DAYS})`)
		.executeTakeFirst();

	return Number(result.numDeletedRows ?? 0);
}
