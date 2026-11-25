import type { NatsConnection, Subscription } from "@nats-io/nats-core";
import { SUBJECTS } from "./subjects";
import { sendAlert } from "../notify/alert";
import { natsService } from "./client";
import { isError } from "@repo/shared/utils";

type Sub = {
  cb: (nc: NatsConnection) => Subscription;
  subject: string;
};

/** One alert per player+check per minute; a cheating player flags constantly. */
const grimThrottle = new Map<string, number>()

export const SUBSCRIBERS: Sub[] = [
  {
    subject: SUBJECTS.GRIM.FLAG,
    cb(nc) {
      const sub = nc.subscribe(this.subject, {
        callback: (e, msg) => {
          if (e) {
            natsService.logger.error(this.subject, e.message);
            return;
          }

          const json = msg.json() as {
            nickname?: string;
            check?: string;
            violations?: string | number;
            server?: string;
            suppressed?: string | number;
          };

          const nickname = json.nickname ?? "?";
          const check = json.check ?? "?";
          const key = `${nickname}|${check}`;
          const now = Date.now();

          if (now - (grimThrottle.get(key) ?? 0) < 60_000) return
          grimThrottle.set(key, now)

          const suppressed = Number(json.suppressed ?? 0);
          const suffix = suppressed > 0 ? ` (+${suppressed} suppressed)` : "";

          void sendAlert({
            from: `grim/${json.server ?? "?"}`,
            title: `GrimAC: ${check}`,
            message: `${nickname} · VL ${json.violations ?? 0}${suffix}`,
            severity: "warning",
          }).catch((err) => {
            natsService.logger.error(`${this.subject}: alert failed: ${isError(err) ? err.message : String(err)}`)
          });
        },
      });

      return sub;
    },
  },
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
