import Elysia, { sse } from "elysia";
import { getNats } from "#/shared/nats/client";
import { logger } from "#/utils/config/logger";
import { orderEventPayloadSchema } from "@repo/shared/schemas/payment";
import { getOrder } from "./order.model";
import type { OrderSingleDefault } from "@repo/shared/types/entities/store";

const getPaymentEventsSubject = (uniqueId: string) => `payment.events.${uniqueId}`

export const sseLogger = logger.withTag("SSE")

export const orderEvents = new Elysia()
  .get("/:id/events", async function* (ctx) {
    const uniqueId = ctx.params.id;
    const data = await getOrder(uniqueId, "default") as OrderSingleDefault | null;

    if (!data) {
      yield sse({ event: "config", data: "disconnect" });
      return;
    }

    if (data.status === "succeeded") {
      yield sse({ event: "payload", data: "succeeded" });
      return;
    }

    const nc = getNats();
    const queue: unknown[] = [];

    yield sse({ event: "config", data: "connected" });

    const orderSubject = getPaymentEventsSubject(uniqueId)

    const sub = nc.subscribe(orderSubject, {
      callback: (_err, msg) => {
        try {
          const decoded = msg.json()
          const result = orderEventPayloadSchema.safeParse(decoded);

          if (!result.success) {
            return;
          }
          
          queue.push(result.data);
        } catch (e) {
          logger.error(e)
        }
      },
    });

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
  });