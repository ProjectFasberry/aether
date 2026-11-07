import { general } from "#/shared/database/general-db";
import { credit } from "#/modules/economy/wallet.model";
import { logErrorMsg } from "#/utils/config/log-utils";
import type { Msg, NatsConnection } from "@nats-io/nats-core";

/** Kept as the server-side test/gift amount; the ledger records each call. */
const GIVE_AMOUNT = 5;

async function handleGiveBalance(msg: Msg) {
	const nickname = msg.data.toString();

	try {
		const account = await general
			.selectFrom("accounts")
			.select("uuid")
			.where("lower_nickname", "=", nickname.toLowerCase())
			.executeTakeFirst();

		if (!account) {
			msg.respond(JSON.stringify({ error: "not updated" }));
			return;
		}

		// A retried request with the same message id credits once.
		const orderId = msg.headers?.get("Nats-Msg-Id") ?? undefined;

		const result = await credit(nickname, "BELKOIN", GIVE_AMOUNT, {
			reason: "server.give_balance",
			orderId,
			actor: "server",
		});

		msg.respond(JSON.stringify({ result: "ok", balance: result.balance }));
	} catch (e) {
		logErrorMsg(e, { subject: "give-balance" });
		msg.respond(JSON.stringify({ error: "not updated" }));
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
