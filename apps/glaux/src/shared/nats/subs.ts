import type { NatsConnection, Subscription } from "@nats-io/nats-core";
import { SUBJECTS } from "./subjects";
import { sendGotify } from "../notify/gotify";
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
            const text = JSON.stringify(json);

            // Gotify does not depend on the Telegram side: a missing bot
            // instance must not swallow the alert.
            const source = typeof json === "object" && json !== null && "from" in json
              ? String((json as { from?: unknown }).from ?? "fasberry")
              : "fasberry";
            const body = typeof json === "object" && json !== null && "data" in json
              ? String((json as { data?: unknown }).data ?? text)
              : text;

            void sendGotify(`${source} alert`, body);

            const instance = bot.getOptionalInstance();
            if (!instance) {
              console.warn("no bot instance available")
              return;
            }

            for (const [chat_id, target] of chats.getData()) {
              const payload = { chat_id, text };

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
