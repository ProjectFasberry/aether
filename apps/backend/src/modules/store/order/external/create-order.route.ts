import Elysia, { t } from "elysia";
import { cryptobot, type CreateOrderPayload, createOrderPayloadSchema } from "./cryptobot.model";
import { createOrderTopUpSchema, type MethodType, type OrderInputPayload } from "@repo/shared/schemas/payment";
import { general } from "#/shared/database/general-db";
import { withData, withError } from "#/shared/schemas";
import { defineUser } from "#/lib/define";
import { wrapError } from "@repo/shared/lib/utils";
import { heleket } from "./heleket.model";

const EVENTS: Partial<Record<MethodType, (pd: OrderInputPayload) => Promise<CreateOrderPayload>>> = {
  "cryptobot": cryptobot.start,
  "heleket": heleket.start
}

export const createOrder = new Elysia()
  .use(defineUser())
  .post("/create", async ({ status, nickname: initiator, body }) => {
    const { target, method, comment, value, recipient } = body;

    try {
      const isValid = await general
        .selectFrom("payment_methods")
        .select("id")
        .where("isAvailable", "=", true)
        .where("value", "=", method.type)
        .executeTakeFirst()

      if (!isValid?.id) {
        throw status(400, wrapError("INCORRECT_PAYMENT_METHOD"));
      }

      const event = EVENTS[method.type];
      if (!event) {
        throw status(400, wrapError("INCORRECT_PAYMENT_METHOD"));
      }

      const data = await event({ target, method, value, comment, recipient, initiator });

      return { data }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "INTERNAL_ERROR"
      throw status(500, wrapError(msg))
    }
  }, {
    body: createOrderTopUpSchema,
    response: {
      200: withData(createOrderPayloadSchema),
      400: withError(
        t.UnionEnum([
          "INCORRECT_PAYMENT_METHOD",
        ])
      ),
      500: withError(
        t.UnionEnum([
          "INTERNAL_ERROR"
        ])
      )
    }
  })