import { getOption } from "#/shared/constants/options";
import { general } from "#/shared/database/general-db";
import { natsService } from "#/shared/nats/client";
import { SUBJECTS } from "@repo/shared/constants/subjects";
import type { DB } from "@gen/db/general";
import type { Kysely } from "kysely";

const db = general as unknown as Kysely<DB & { admin_activity_log: any }>;

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
		.values({ initiator, event, metadata, severity, source })
		.returningAll()
		.executeTakeFirstOrThrow();

	natsService.getInstance().publish(SUBJECTS.ADMIN.ACTIVITY.LOG, JSON.stringify(query));
}
