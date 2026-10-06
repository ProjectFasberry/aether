import { natsService } from "#/shared/nats/client";
import { SUBJECTS } from "#/shared/nats/subjects";
import * as z from "zod";
import { logErrorMsg } from "#/utils/config/log-utils";
import { general } from "#/shared/database/general-db";
import type { NatsConnection } from "@nats-io/nats-core";
import { logger } from "@repo/shared/utils/logger";

const userJoinSchema = z.object({
	date: z.string(),
	nickname: z.string(),
	event: z.enum(["join", "quit"]),
});

function pushToReferral({ nickname }: { nickname: string }) {
	const nc = natsService.getInstance();

	const payload = new TextEncoder().encode(nickname);
	nc.publish(SUBJECTS.USERS.REWARD_CHECK, payload);
}

async function joinEvents({ nickname, date }: Omit<z.infer<typeof userJoinSchema>, "event">) {
	pushToReferral({ nickname });

	const query = await general
		.insertInto("activity_users")
		.values({
			event: new Date().toISOString(),
			nickname,
			type: "join",
		})
		.executeTakeFirst();

	if (Number(query.numInsertedOrUpdatedRows)) {
		console.log("updated", query.insertId);
	}
}

async function quitEvents({ nickname, date }: Omit<z.infer<typeof userJoinSchema>, "event">) {
	const query = await general
		.insertInto("activity_users")
		.values({
			event: new Date().toISOString(),
			nickname,
			type: "quit",
		})
		.executeTakeFirst();

	if (!query.numInsertedOrUpdatedRows) {
		logger.warn(`Activity for ${nickname} is not created`);
	}
}

async function handlePlayerJoin(payload: z.infer<typeof userJoinSchema>) {
	if (!userJoinSchema.shape.event.options.includes(payload.event)) {
		return;
	}

	try {
		switch (payload.event) {
			case "join":
				joinEvents(payload);
				break;
			case "quit":
				quitEvents(payload);
				break;
		}
	} catch (e) {
		logErrorMsg(e);
	}
}

export const subscribePlayerJoin = (nc: NatsConnection, subject: string) => {
	const subscription = nc.subscribe(subject, {
		callback: (e, msg) => {
			if (e) {
				return logErrorMsg(e, { subject });
			}

			const parsed = userJoinSchema.safeParse(msg.json());

			if (!parsed.success) {
				return logErrorMsg(parsed.error.issues[0].message, { subject });
			}

			handlePlayerJoin(parsed.data);
		},
	});

	return subscription;
};
