import Elysia, { sse } from "elysia";
import * as z from "zod/v4";
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
      sseLogger.log("Disconnect. Order not found");
      yield sse({ event: "config", data: "disconnect" });
      return;
    }

    if (data.status === "succeeded") {
      sseLogger.log("Order is succeeded", uniqueId);
      yield sse({ event: "payload", data: "succeeded" });
      return;
    }

    const nc = getNats();
    const decoder = new TextDecoder();
    const queue: unknown[] = [];

    yield sse({ event: "config", data: "connected" });
    sseLogger.log("Connected", uniqueId);

    const orderSubject = getPaymentEventsSubject(uniqueId)
    sseLogger.log(`Subscribed to ${orderSubject}`);

    const sub = nc.subscribe(orderSubject, {
      callback: (_err, msg) => {
        try {
          const decoded = decoder.decode(msg.data);
          const result = orderEventPayloadSchema.safeParse(
            JSON.parse(decoded)
          );

          if (!result.success) {
            sseLogger.warn(`Invalid message payload`, z.treeifyError(result.error));
            return;
          }
          
          queue.push(result.data);
        } catch (err) {
          sseLogger.warn("Failed to process message", err);
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
      sseLogger.log("NATS unsubscribed")
      sub.unsubscribe();
    }
  });