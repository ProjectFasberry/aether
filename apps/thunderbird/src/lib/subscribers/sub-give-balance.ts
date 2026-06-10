import { playerpoints } from "#/shared/database/playerpoints-db";
import { logErrorMsg } from "#/utils/config/log-utils";
import type { Msg, NatsConnection } from "@nats-io/nats-core";
import { sql } from "kysely";

async function handleGiveBalance(msg: Msg) {
	const nickname = msg.data.toString();

	try {
		const res = await playerpoints
			.updateTable("playerpoints_points")
			.set({ points: sql`points + 5` })
			.where(
				"uuid",
				"=",
				playerpoints.selectFrom("playerpoints_username_cache").select("uuid").where("username", "=", nickname),
			)
			.executeTakeFirstOrThrow();

		const payload = res.numUpdatedRows ? JSON.stringify({ result: "ok" }) : JSON.stringify({ error: "not updated" });

		msg.respond(payload);
	} catch (e) {
		logErrorMsg(e);
	}
}

export const subscribeGiveBalance = (nc: NatsConnection, subject: string) => {
	const subscription = nc.subscribe(subject, {
		callback: (e, msg) => {
			if (e) return logErrorMsg(e);

			void handleGiveBalance(msg);
		},
	});

	return subscription;
};
