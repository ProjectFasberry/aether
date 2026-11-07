import { getOption } from "#/shared/constants/options";
import { general } from "#/shared/database/general-db";
import { natsService } from "#/shared/nats/client";
import { SUBJECTS } from "@repo/shared/constants/subjects";
import type { JsonValue } from "@gen/db/general";

const db = general;

export type AdminActivityLogInput = {
	event: string;
	initiator: string;
	/** Structured context (target, before/after, IP, ...) shown in the panel drawer. */
	metadata?: Record<string, unknown>;
	severity?: "info" | "warning" | "danger";
	source?: string;
};

export async function createAdminActivityLog({
	event,
	initiator,
	metadata = {},
	severity = "info",
	source = "panel",
}: AdminActivityLogInput): Promise<void> {
	const loggingEnabled = await getOption("eventsLogging");
	if (!loggingEnabled) return;

	const query = await db
		.insertInto("admin_activity_log")
		.values({ initiator, event, metadata: metadata as JsonValue, severity, source })
		.returningAll()
		.executeTakeFirstOrThrow();

	natsService.getInstance().publish(SUBJECTS.ADMIN.ACTIVITY.LOG, JSON.stringify(query));
}
