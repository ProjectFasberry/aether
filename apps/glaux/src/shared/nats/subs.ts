import type { NatsConnection, Subscription } from "@nats-io/nats-core";
import { SUBJECTS } from "./subjects";
import { sendAlert } from "../notify/alert";
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

            const source = typeof json === "object" && json !== null && "from" in json
              ? String((json as { from?: unknown }).from ?? "fasberry")
              : "fasberry";
            const body = typeof json === "object" && json !== null && "data" in json
              ? String((json as { data?: unknown }).data ?? text)
              : text;

            void sendAlert({ from: source, message: body, title: `${source} alert` })
              .catch((e) => {
                const errMsg = `${this.subject}: alert fan-out failed: ${isError(e) ? e.message : String(e)}`
                natsService.logger.error(errMsg)
              });
          } catch (e) {
            natsService.logger.error(`${this.subject}: ${isError(e) ? e.message : String(e)}`)
          }
        },
      });

      return sub;
    },
  },
];
