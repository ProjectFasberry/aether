import Elysia, { sse, t } from "elysia";
import { nats } from "#/shared/nats/client";
import { logger } from "#/utils/config/logger";
import { orderEventPayloadSchema } from "@repo/shared/schemas/payment";
import { externalOrders } from "./external-order.model";

const getPaymentEventsSubject = (uniqueId: string) => `payment.events.${uniqueId}`

export const orderEvents = new Elysia()
  .get("/events", async function* ({ params: { id: uniqueId }, ...ctx }) {
    const data = await externalOrders.getSingle(uniqueId)

    if (!data) {
      yield sse({ event: "config", data: "disconnect" });
      return;
    }

    if (data.status === "succeeded") {
      yield sse({ event: "payload", data: "succeeded" });
      return;
    }

    const nc = nats.get()
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

          if (msg) {
            yield sse({ data: msg, event: "payload" })
          }
        }

        yield sse({ event: "config", data: "ping" });
        
        await new Promise((r) => setTimeout(r, 1000));
      }
    } finally {
      sub.unsubscribe();
    }
  }, {
    params: t.Object({
      id: t.String()
    })
  });