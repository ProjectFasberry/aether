import { validatePermission } from "#/lib/validators";
import { permissionsService } from "#/shared/constants/permissions";
import { natsService } from "#/shared/nats/client";
import { buildRouteSummary, safeJsonParse } from "#/utils";
import { SUBJECTS } from "@repo/shared/constants/subjects";
import type { Subscription } from "@nats-io/nats-core";
import Elysia, { sse } from "elysia";
import { logger } from "@repo/shared/utils/logger";

type HistoryPayload = {
  id: number;
  created_at: Date | string;
  event: string;
  initiator: string;
  metadata?: unknown;
  severity?: string;
  source?: string;
};

/** Per-client buffer is bounded: a slow panel must not grow memory forever. */
const QUEUE_LIMIT = 100;
/** Idle heartbeat; the old loop emitted every second per client. */
const HEARTBEAT_MS = 15_000;

type Client = (payload: HistoryPayload) => void;

const clients = new Set<Client>();
let subscription: Subscription | null = null;

function ensureSubscription() {
  if (subscription) return;

  const nc = natsService.getInstance();
  const decoder = new TextDecoder();

  subscription = nc.subscribe(SUBJECTS.ADMIN.ACTIVITY.LOG, {
    callback: (error, message) => {
      if (error) {
        logger.error(error);
        return;
      }

      const parsed = safeJsonParse<HistoryPayload>(decoder.decode(message.data));
      if (!parsed.ok) return;

      for (const client of clients) {
        client(parsed.value);
      }
    },
  });
}

function releaseSubscription() {
  if (clients.size > 0) return;

  subscription?.unsubscribe();
  subscription = null;
}

export const historyEvents = new Elysia()
  .use(validatePermission(permissionsService.get("HISTORY.READ")))
  .get("/events", async function* ({ request }) {
    const queue: HistoryPayload[] = [];
    let wake: (() => void) | null = null;

    const push: Client = (payload) => {
      if (queue.length >= QUEUE_LIMIT) queue.shift();
      queue.push(payload);
      wake?.();
    };

    clients.add(push);
    ensureSubscription();

    const abort = () => wake?.();
    request.signal.addEventListener("abort", abort, { once: true });

    try {
      yield sse({ event: "config", data: "connected" });

      while (!request.signal.aborted) {
        while (queue.length > 0) {
          const payload = queue.shift();
          if (payload) yield sse({ data: payload, event: "payload" });
        }

        await new Promise<void>((resolve) => {
          wake = resolve;
          const timer = setTimeout(resolve, HEARTBEAT_MS);
          request.signal.addEventListener("abort", () => {
            clearTimeout(timer);
            resolve();
          }, { once: true });
        });
        wake = null;

        if (!request.signal.aborted) {
          yield sse({ event: "config", data: "ping" });
        }
      }
    } finally {
      request.signal.removeEventListener("abort", abort);
      clients.delete(push);
      releaseSubscription();
    }
  }, {
    detail: {
      summary: buildRouteSummary("Get history events"),
    },
  });
