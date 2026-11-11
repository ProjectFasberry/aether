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
	/** Optional until the proxy publishes them; history stays useful without. */
	uuid: z.string().optional(),
	session: z.string().optional(),
});

type Presence = z.infer<typeof presenceSchema>;

function pushToReferral({ nickname }: { nickname: string }) {
	const nc = natsService.getInstance();

	const payload = new TextEncoder().encode(nickname);
	nc.publish(SUBJECTS.USERS.REWARD_CHECK, payload);
}

/** `players.uuid` is stable across renames, the nickname in the payload is not. */
async function resolveUuid(nickname: string, uuid?: string) {
	if (uuid) return uuid;

	const row = await general
		.selectFrom("players")
		.select("uuid")
		.where("nickname", "=", nickname)
		.executeTakeFirst();

	return row?.uuid ?? null;
}

async function recordActivity(presence: Presence, type: "join" | "quit") {
	const { name, server, session } = presence;
	const uuid = await resolveUuid(name, presence.uuid);

	const query = await general
		.insertInto("activity_users")
		.values({
			event: new Date().toISOString(),
			nickname: name,
			type,
			server,
			uuid,
			session: session ?? null,
		})
		.executeTakeFirst();

	if (!Number(query.numInsertedOrUpdatedRows)) {
		logger.warn(`Activity for ${name} is not recorded (${type})`);
	}
}

async function handlePresence(payload: Presence, type: "join" | "quit") {
	const nickname = payload.name;

	try {
		if (type === "join") pushToReferral({ nickname });

		await recordActivity(payload, type);
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
