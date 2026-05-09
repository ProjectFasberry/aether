import type { NatsConnection, Subscription } from "@nats-io/nats-core";
import { SUBJECTS } from "./subjects";
import { bot } from "../bot";
import { chats } from "../bot/chats";

type Sub = {
	cb: (nc: NatsConnection) => Subscription;
	subject: string;
};

export const subs: Sub[] = [
	{
		subject: SUBJECTS.INTERNAL.HEALTH,
		cb(nc) {
			const sub = nc.subscribe(this.subject, {
				callback: (e, msg) => {
					if (e) {
						throw e;
					}

					const json = msg.json();
					const botClient = bot.get();

					const chatList = chats.get();

					for (const chat of chatList) {
						botClient.api.sendMessage({ chat_id: chat, text: JSON.stringify(json) });
					}
				},
			});

			return sub;
		},
	},
];
