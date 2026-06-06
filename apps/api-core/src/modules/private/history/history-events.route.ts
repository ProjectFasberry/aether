import { defineRequiredUser } from "#/lib/define";
import { nats } from "#/shared/nats/client";
import Elysia, { sse } from "elysia";
import { logger } from "#/shared/constants/logger";
import { safeJsonParse } from "#/utils";
import { SUBJECTS } from "@repo/shared/constants/subjects";

type HistoryPayload = {
  event: string;
  id: number;
  created_at: Date;
  initiator: string;
}

export const historyEvents = new Elysia()
  .use(defineRequiredUser())
  .get("/events", async function* ({ nickname }) {
    const nc = nats.getInstance()
    const decoder = new TextDecoder();
    const queue: unknown[] = [];

    yield sse({ event: "config", data: "connected" });

    const sub = nc.subscribe(SUBJECTS.ADMIN.ACTIVITY.LOG, {
      callback: (e, msg) => {
        try {
          if (e) {
            throw e
          }

          const decoded = decoder.decode(msg.data);
          const result = safeJsonParse<HistoryPayload>(decoded)

          if (!result.ok) {
            return;
          }

          queue.push(result.value);
        } catch (e) {
          logger.error(e)
        }
      }
    })

    try {
      while (true) {
        while (queue.length) {
          const msg = queue.shift();
          if (msg) yield sse({ data: msg, event: "payload" })
        }
        yield sse({ event: "config", data: "ping" });
        await new Promise((r) => setTimeout(r, 1000));
      }
    } finally {
      sub.unsubscribe();
    }
  })
