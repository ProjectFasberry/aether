import Elysia, { type Static, t } from "elysia";
import { processStoreCryptoPurchaseCryptobot } from "./cryptobot.model";
import { createOrderTopUpSchema, type MethodType, type OrderInputPayload } from "@repo/shared/schemas/payment";
import { general } from "#/shared/database/general-db";
import { withData, withError } from "#/shared/schemas";
import { defineUser } from "#/lib/middlewares/define";
import { invariant } from "#/helpers/invariant";
import { wrapError } from "@repo/shared/lib/utils";

async function validateMethodAvailable(method: string) {
  const query = await general
    .selectFrom("payment_methods")
    .select("id")
    .where("isAvailable", "=", true)
    .where("value", "=", method)
    .executeTakeFirst()

  return Boolean(query)
}

const outputSchema = t.Object({
  url: t.String(),
  orderId: t.String(),
  invoiceId: t.Number(),
  totalPrice: t.Number(),
  uniqueId: t.String(),
})
type OutputPayload = Static<typeof outputSchema>;

const targets: Record<MethodType, (pd: OrderInputPayload) => Promise<OutputPayload>> = {
  "cryptobot": async (pd) => processStoreCryptoPurchaseCryptobot(pd),
  "heleket": async (pd) => {
    invariant(false, "METHOD_NOT_AVAILABLE")
  },
  "sbp": async (pd) => {
    invariant(false, "METHOD_NOT_AVAILABLE")
  },
}

export const createOrder = new Elysia()
  .use(defineUser())
  .post("/create", async ({ status, nickname: initiator, body }) => {
    const { target, method, comment, value, recipient } = body;

    try {
      const isValid = await validateMethodAvailable(method.type);
      if (!isValid) {
        throw status(400, wrapError("INCORRECT_PAYMENT_METHOD"));
      }

      const event = targets[method.type];
      const data = await event({ target, method, value, comment, recipient, initiator });

      return { data }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "INTERNAL_ERROR"
      throw status(500, wrapError(msg))
    }
  }, {
    body: createOrderTopUpSchema,
    response: {
      200: withData(
        outputSchema
      ),
      400: withError,
      500: withError
    }
  })