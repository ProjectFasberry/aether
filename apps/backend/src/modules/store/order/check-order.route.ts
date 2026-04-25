import Elysia from "elysia";
import { wrapError } from "#/helpers/wrap-error";
import type { InvoiceType } from "#/shared/types/payment/payment-types";
import { createHmac, createHash } from 'node:crypto';
import { getRedis } from "#/shared/redis/init";
import { getOrderKey } from "./create-crypto-order";
import { logger } from "#/utils/config/logger";
import { CRYPTO_PAY_TESTNET_TOKEN, isProduction } from "#/shared/env";
import { safeJsonParse } from "#/utils/config/transforms";
import type { OrderSingleDefault } from "@repo/shared/types/entities/store";
import { general } from "#/shared/database/general-db";
import { invariant } from "#/helpers/invariant";

type CheckOrderBody = {
  update_id: number,
  payload: InvoiceType,
  request_date: string,
  update_type: string
}

export function validateSignatureCryptoPay(
  body: string,
  resSignature: string
) {
  const secret = createHash('sha256')
    .update(CRYPTO_PAY_TESTNET_TOKEN)
    .digest()

  const hmac = createHmac('sha256', secret)
    .update(body)
    .digest('hex')

  return hmac === resSignature
}

export const checkOrderRoute = new Elysia()
  .post('/process-order', async ({ status, ...ctx }) => {
    const text = ctx.body as string;
    const signature = ctx.headers['crypto-pay-api-signature']

    if (!signature || !text) {
      throw status(400, wrapError("SIGNATURE_OR_BODY_IS_REQUIRED"))
    }

    const isValid = validateSignatureCryptoPay(text, signature);
    if (!isValid) {
      throw status(400, wrapError("INVALID_SIGNATURE"))
    }

    const redis = getRedis()

    const bodyResult = safeJsonParse<CheckOrderBody>(text)
    if (!bodyResult.ok) {
      throw status(500, wrapError("INCORRECT_BODY"))
    }

    const { update_type, payload } = bodyResult.value;
    invariant(payload.payload, "Payload is not found")

    const payloadResult = safeJsonParse<OrderSingleDefault>(payload.payload);
    if (!payloadResult.ok) {
      throw status(500, wrapError("INCORRECT_PAYLOAD"))
    }

    const data = payloadResult.value;
    const uniqueId = data.unique_id;

    if (!uniqueId) {
      throw status(500, wrapError("PAYMENT_NOT_FOUND"))
    }

    if (payload.status === 'expired') {
      await redis.del(getOrderKey(uniqueId))
      logger.success("Payment deleted from redis because is expired", payload.invoice_id)
    }

    if (update_type === 'invoice_paid') {
      const cached = await redis.get(getOrderKey(uniqueId))
      if (!cached) {
        throw status(404, wrapError("PAYMENT_NOT_FOUND"))
      }

      const cachedOrderResult = safeJsonParse<OrderSingleDefault>(cached);
      if (!cachedOrderResult.ok) {
        throw status(400, wrapError("INCORRECT_ORDER_DATA"))
      }

      const order = cachedOrderResult.value

      await general.transaction().execute(async (trx) => {
        const query = await trx
          .insertInto("payments")
          // @ts-expect-error
          .values({
            ...order,
            status: "succeeded",
          })
          .executeTakeFirst()

        if (!query.numInsertedOrUpdatedRows) {
          if (!isProduction) {
            logger.success("Payment saved to database", payload.invoice_id)
          }
          
          throw status(500, wrapError("PAYMENT_NOT_SAVED"))
        }

        // publishPaymentSuccess()
        // publishPaymentLog({ ...meta, orderId: payload.hash })

        await redis.del(getOrderKey(uniqueId));

        if (!isProduction) {
          logger.success("Deleted from redis cache. Order", payload.invoice_id)
        }
      })
    }

    return { ok: true }
  }, {
    parse: "text/plain"
  })