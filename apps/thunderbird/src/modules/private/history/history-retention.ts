import { general } from "#/shared/database/general-db";
import type { DB } from "@gen/db/general";
import type { Kysely } from "kysely";

const db = general as unknown as Kysely<DB & { admin_activity_log: any }>;

/** Audit rows are hot for half a year; older ones go in bounded batches. */
const RETENTION_DAYS = 180;
const BATCH = 5_000;

export async function cleanOldHistory(): Promise<number> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  let removed = 0;

  while (true) {
    const rows = await db
      .selectFrom("admin_activity_log")
      .select("id")
      .where("created_at", "<", cutoff)
      .orderBy("created_at", "asc")
      .limit(BATCH)
      .execute() as { id: number }[];

    if (rows.length === 0) break;

    const result = await db
      .deleteFrom("admin_activity_log")
      .where("id", "in", rows.map((row) => row.id))
      .executeTakeFirst();

    removed += Number(result.numDeletedRows ?? 0);

    if (rows.length < BATCH) break;
  }

  return removed;
}
