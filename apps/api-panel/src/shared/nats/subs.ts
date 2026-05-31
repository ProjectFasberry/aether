import type { NatsConnection, Subscription } from "@nats-io/nats-core";
import { SUBJECTS } from "./subjects";
import { bot } from "../bot";
import { chats } from "../bot/chats";
import { natsLogger } from "../logger";

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
            natsLogger.error(this.subject, e.message)
            return;
          }

          const json = msg.json();

          for (const chat of chats.get()) {
            const payload = { chat_id: chat, text: JSON.stringify(json) };

            bot.get().api.sendMessage(payload)
              .catch(e => natsLogger.error(this.subject, e.message));
          }
        },
      });

      return sub;
    },
  },
];
