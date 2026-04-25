import Elysia, { t } from "elysia";
import { processStoreCryptoPurchaseCryptobot } from "./cryptobot/cryptobot.model";
// import { processStoreCryptoPurchaseHeleket } from "./heleket/heleket.model";
import { createOrderTopUpSchema, type MethodType, type OrderInputPayload, type OutputPayload } from "@repo/shared/schemas/payment";
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

const targets: Record<MethodType, (pd: OrderInputPayload) => Promise<OutputPayload>> = {
  "cryptobot": async (payload) => {
    return processStoreCryptoPurchaseCryptobot(payload)
  },
  "heleket": async (payload) => {
    invariant(false, "Некорректный способ оплаты. Heleket пока не доступен")
    // return processStoreCryptoPurchaseHeleket(payload)
  },
  "sbp": async (payload) => {
    invariant(false, "Некорректный способ оплаты. SBP пока не доступен")
  },
}

export const createOrderTopUp = new Elysia()
  .use(defineUser())
  .post("/top-up", async ({ status, nickname: initiator, body }) => {
    const { target, method, comment, value, recipient } = body;

    const event = targets[method.type];

    const isValid = await validateMethodAvailable(method.type);
    if (!isValid) {
      throw status(400, wrapError("INCORRECT_PAYMENT_METHOD"));
    }

    const data: OutputPayload = await event({ target, method, value, comment, recipient, initiator });

    return { data }
  }, {
    body: createOrderTopUpSchema,
    response: {
      200: withData(
        t.Object({
          url: t.String(),
          orderId: t.String(),
          invoiceId: t.Number(),
          totalPrice: t.Number(),
          uniqueId: t.String(),
        })
      ),
      400: withError
    }
  })