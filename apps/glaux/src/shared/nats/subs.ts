import type { NatsConnection, Subscription } from "@nats-io/nats-core";
import { SUBJECTS } from "./subjects";
import { bot } from "../bot";
import { chats } from "../bot/chats";
import { natsService } from "./client";
import { isError } from "@repo/shared/utils";

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
            natsService.logger.error(this.subject, e.message);
            return;
          }

          const json = msg.json();

          try {
            const instance = bot.getOptionalInstance();
            if (!instance) {
              console.warn("no bot instance available")
              return;
            }

            for (const [chat_id, target] of chats.getData()) {
              const payload = { chat_id, text: JSON.stringify(json) };

              instance
                .api.sendMessage(payload)
                .catch((e) => natsService.logger.error(this.subject, e.message));
            }
          } catch (e) {
            natsService.logger.error(this.subject, isError(e) ? e.message : "unknown error")
          }
        },
      });

      return sub;
    },
  },
];
