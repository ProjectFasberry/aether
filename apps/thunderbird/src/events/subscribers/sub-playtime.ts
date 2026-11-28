import type { NatsConnection } from "@nats-io/nats-core";
import * as z from "zod";
import { logErrorMsg } from "#/shared/observability/log";
import { safeJsonParse } from "@repo/shared/utils";
import { logger } from "@repo/shared/utils/logger";
import {
	ingestPlaytimeReport,
	MAX_PLAYTIME_REPORT_SECONDS,
} from "#/modules/server/playtime/playtime.model";

/**
 * Contract of `server.player.playtime.report`, published by the
 * NatsIntegration poller on every backend. `id` is unique per publish and is
 * the idempotency key; `server` comes from that backend's `server-id`.
 */
const reportSchema = z.object({
	id: z.string().uuid(),
	sessionId: z.string().uuid(),
	uuid: z.string().max(64).optional(),
	nickname: z.string().min(1).max(16),
	server: z.string().min(1).max(32),
	seconds: z.number().int().positive().max(MAX_PLAYTIME_REPORT_SECONDS),
	startedAt: z.string().optional(),
});

export const subscribePlaytime = (nc: NatsConnection, subject: string) => {
	const subscription = nc.subscribe(subject, {
		callback: (error, message) => {
			if (error) return logErrorMsg(error, { subject });

			const parsedJson = safeJsonParse<unknown>(new TextDecoder().decode(message.data));
			if (!parsedJson.ok) return logErrorMsg("Invalid playtime report JSON", { subject });

			const parsed = reportSchema.safeParse(parsedJson.value);
			if (!parsed.success) {
				return logErrorMsg(`Invalid playtime report: ${parsed.error.issues[0]?.message}`, { subject });
			}

			void ingestPlaytimeReport({
				id: parsed.data.id,
				sessionId: parsed.data.sessionId,
				uuid: parsed.data.uuid ?? null,
				nickname: parsed.data.nickname,
				server: parsed.data.server,
				seconds: parsed.data.seconds,
			}).catch((e) => logErrorMsg(e, { subject }));
		},
	});

	logger.debug(`Playtime subscription started on ${subject}`);

	return subscription;
};
