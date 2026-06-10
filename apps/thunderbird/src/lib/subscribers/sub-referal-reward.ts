import { logErrorMsg } from "#/utils/config/log-utils";
import { callServerCommand } from "#/utils/server/call-command";
import type { Msg, NatsConnection } from "@nats-io/nats-core";

type ReferalRewardPayload = {
	referrer: string;
	referral: string;
};

async function handleReferalReward(msg: Msg) {
	const payload = msg.json<ReferalRewardPayload>();
	if (!payload) return;

	try {
		await callServerCommand({ parent: "cmi", value: `money give ${payload.referral} 50` });
		await callServerCommand({ parent: "p", value: `give ${payload.referrer} 1` });
	} catch (e) {
		logErrorMsg(e);
	}
}

export const subscribeReferalReward = (nc: NatsConnection, subject: string) => {
	const subscription = nc.subscribe(subject, {
		callback: (e, msg) => {
			if (e) return logErrorMsg(e);

			void handleReferalReward(msg);
		},
	});

	return subscription;
};
