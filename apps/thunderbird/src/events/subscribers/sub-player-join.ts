import { natsService } from "#/shared/nats/client";
import { SUBJECTS } from "#/shared/nats/subjects";
import { logErrorMsg } from "#/shared/observability/log";
import { general } from "#/shared/database/general-db";
import type { NatsConnection } from "@nats-io/nats-core";
import { logger } from "@repo/shared/utils/logger";
import { subscribeGeneralPlayerJoin, subscribeGeneralPlayerQuit } from "@projectfasberry/events"
import * as z from "zod";

/**
 * Contract of `general.player.join` / `general.player.quit` (see
 * `@projectfasberry/events`): the proxy publishes one join per connection and
 * one quit per disconnect, so a server switch does not create duplicates.
 */
const presenceSchema = z.object({
	date: z.string(),
	name: z.string(),
	server: z.string(),
});

type Presence = z.infer<typeof presenceSchema>;

function pushToReferral({ nickname }: { nickname: string }) {
	const nc = natsService.getInstance();

	const payload = new TextEncoder().encode(nickname);
	nc.publish(SUBJECTS.USERS.REWARD_CHECK, payload);
}

async function recordActivity(nickname: string, type: "join" | "quit") {
	const query = await general
		.insertInto("activity_users")
		.values({
			event: new Date().toISOString(),
			nickname,
			type,
		})
		.executeTakeFirst();

	if (!Number(query.numInsertedOrUpdatedRows)) {
		logger.warn(`Activity for ${nickname} is not recorded (${type})`);
	}
}

async function handlePresence(payload: Presence, type: "join" | "quit") {
	const nickname = payload.name;

	try {
		if (type === "join") pushToReferral({ nickname });

		await recordActivity(nickname, type);
	} catch (e) {
		logErrorMsg(e);
	}
}

export const subscribePlayerJoin = (nc: NatsConnection, subject: string) => {
	const join = subscribeGeneralPlayerJoin(nc, (msg, e) => {
		if (e || !msg) {
			return logErrorMsg(e, { subject });
		}

		const parsed = presenceSchema.safeParse(msg.json());

		if (!parsed.success) {
			return logErrorMsg(parsed.error.issues[0].message, { subject });
		}

		void handlePresence(parsed.data, "join");
	});

	subscribeGeneralPlayerQuit(nc, (msg, e) => {
		if (e || !msg) {
			return logErrorMsg(e, { subject });
		}

		const parsed = presenceSchema.safeParse(msg.json());

		if (!parsed.success) {
			return logErrorMsg(parsed.error.issues[0].message, { subject });
		}

		void handlePresence(parsed.data, "quit");
	});

	return join;
};
