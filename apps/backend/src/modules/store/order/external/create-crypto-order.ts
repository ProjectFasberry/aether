import { CRYPTO_PAY_API } from "#/shared/api/crypto-api";
import { getRedis } from "#/shared/redis/client";
import type { ExchangeRate } from "#/shared/types/payment/payment-types";
import { logger } from "#/utils/config/logger";
import type { currencyCryptoSchema } from "@repo/shared/schemas/entities/currencies-schema";
import type * as z from "zod/v4";
import { FRONTEND_URL } from "#/shared/env";
import { general } from "#/shared/database/general-db";
import { type CryptoPayPayload, EXCHANGE_RATES_KEY } from "./cryptobot.model";
import { invariant } from "#/helpers/invariant";

export const getOrderLink = (uniqueId: string) => `${FRONTEND_URL}/store/order/${uniqueId}`
export const getOrderKey = (uniqueId: string) => `order:${uniqueId}`
export const getOrderInitiatorIndexKey = (initiator: string) => `index:initiator:${initiator}`
export const getOrderRateKey = (initiator: string) => `rate:order_limit:${initiator}`

const ORDER_LIMIT = 64;
const WINDOW_SECONDS = 10 * 60;

function extractDiff(rubPrice: number, exchangeRate: number): number {
  const priceInTargetCurrency = rubPrice / exchangeRate;
  return parseFloat(priceInTargetCurrency.toFixed(8));
}

export const exchangeRates = {
  async getList() {
    const redis = getRedis()
    return redis.get(EXCHANGE_RATES_KEY)
  }
}

export async function getEconomyByTarget(target: string) {
  return general
    .selectFrom("store_economy")
    .select(["value", "type"])
    .where("type", "=", target)
    .executeTakeFirstOrThrow()
}

export async function getPriceInCurrency(
  inputPrice: number,
  currency: z.infer<typeof currencyCryptoSchema>
): Promise<number> {
  const data = await exchangeRates.getList()
  invariant(data, "Exchange rates cache is not defined")

  const rates: ExchangeRate[] = JSON.parse(data)

  const target = rates.find(
    target => target.source === currency && target.target === "RUB"
  )

  invariant(target, "Selected wallet is not corrected")

  const outputPrice = extractDiff(inputPrice, Number(target.rate))
  return outputPrice;
}

export async function rollbackOrder({
  invoiceId, uniqueId, initiator
}: {
  invoiceId: number, uniqueId: string, initiator: string
}) {
  const deleteInvoice = await general.transaction().execute(async (trx) => {
    const redis = getRedis();

    const deleteInvoice = await CRYPTO_PAY_API
      .post(`deleteInvoice`, { json: { invoice_id: invoiceId } })
      .json<CryptoPayPayload<boolean>>()

    if (!deleteInvoice.ok) return;

    logger.log(`Deleted invoice ${invoiceId} - ${deleteInvoice.result}`)

    await Promise.all([
      redis.del(getOrderKey(uniqueId)),
      redis.del(getOrderInitiatorIndexKey(initiator))
    ])

    return true;
  })

  return deleteInvoice ?? false
}

export async function validateOrderLimit(initiator: string): Promise<boolean> {
  const redis = getRedis();
  const key = getOrderRateKey(initiator)

  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, WINDOW_SECONDS);
  }

  return count <= ORDER_LIMIT;
}