import type { NatsConnection, Subscription } from "@nats-io/nats-core";
import { SUBJECTS } from "./subjects";
import { bot } from "../bot";
import { chats } from "../bot/chats";
import { nats } from "./client";

type Sub = {
	cb: (nc: NatsConnection) => Subscription;
	subject: string;
};

export const SUBSCRIBERS: Sub[] = [
	{
		subject: SUBJECTS.INTERNAL.HEALTH,
		cb(nc) {
			const sub = nc.subscribe(this.subject, {
				callback: (e, msg) => {
					if (e) {
						nats.logger.error(this.subject, e.message);
						return;
					}

					const json = msg.json();

					for (const chat of chats.getData()) {
						const payload = { chat_id: chat, text: JSON.stringify(json) };

						bot
							.getInstance()
							.api.sendMessage(payload)
							.catch((e) => nats.logger.error(this.subject, e.message));
					}
				},
			});

			return sub;
		},
	},
];
