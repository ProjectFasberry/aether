import { getOption } from "#/shared/constants/options";
import { general } from "#/shared/database/general-db";
import { natsService } from "#/shared/nats/client";
import { SUBJECTS } from "@repo/shared/constants/subjects";

export async function createAdminActivityLog({
	event,
	initiator,
}: {
	event: string;
	initiator: string;
}): Promise<void> {
	const loggingEnabled = await getOption("eventsLogging");
	if (!loggingEnabled) return;

	const query = await general
		.insertInto("admin_activity_log")
		.values({ initiator, event })
		.returningAll()
		.executeTakeFirstOrThrow();

	natsService.getInstance().publish(SUBJECTS.ADMIN.ACTIVITY.LOG, JSON.stringify(query));
}
