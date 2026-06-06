import { general } from "#/shared/database/general-db";
import { nats } from "#/shared/nats/client";
import { SUBJECTS } from "@repo/shared/constants/subjects";

export async function createAdminActivityLog({
  event, initiator
}: { event: string, initiator: string }): Promise<void> {
  const query = await general
    .insertInto("admin_activity_log")
    .values({ initiator, event })
    .returningAll()
    .executeTakeFirstOrThrow()

  nats.getInstance().publish(SUBJECTS.ADMIN.ACTIVITY.LOG, JSON.stringify(query))
}
