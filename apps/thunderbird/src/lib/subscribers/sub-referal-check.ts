import { general } from "#/shared/database/general-db";
import { logErrorMsg } from "#/utils/config/log-utils";
import { logger } from "#/shared/constants/logger";
import { callServerCommand } from "#/utils/server/call-command";
import { validateReferal } from "#/utils/server/validate-referal";
import type { Msg, NatsConnection } from "@nats-io/nats-core";

async function handleReferalCheck(msg: Msg) {
	const nickname = msg.string();
	if (!nickname) return;

	try {
		const result = await validateReferal(nickname);
		if (!result) return;

		await general.transaction().execute(async (trx) => {
			// for initiator
			await callServerCommand({ parent: "cmi", value: `money give ${result.initiator} 60` });
			await callServerCommand({ parent: "p", value: `give ${result.initiator} 5` });

			// for recipient
			await callServerCommand({ parent: "cmi", value: `money give ${result.recipient} 30` });
			await callServerCommand({ parent: "p", value: `give ${result.recipient} 1` });

			const update = await trx
				.updateTable("referrals")
				.set({ completed: true })
				.where((eb) => eb.and([eb("referrer", "=", result.initiator), eb("referral", "=", result.recipient)]))
				.executeTakeFirstOrThrow();

			logger.log(update.numUpdatedRows > 0 ? "updated" : "not updated");
		});
	} catch (e) {
		logErrorMsg(e);
	}
}

export const subscribeRefferalCheck = (nc: NatsConnection, subject: string) => {
	const subscription = nc.subscribe(subject, {
		callback: (e, msg) => {
			if (e) return logErrorMsg(e);

			void handleReferalCheck(msg);
		},
	});

	return subscription;
};
