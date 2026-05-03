import { currencyCryptoSchema } from "@repo/shared/constants/currencies";
import { getEconomyByTarget, getOrderInitiatorIndexKey, getOrderKey, getOrderLink, getOrderRateKey } from "./create-crypto-order";
import type { CreateOrderTopUpSchema, GameCurrency, OrderInputPayload, StoreExchangeRatesPayload } from "@repo/shared/schemas/payment";
import { getRedis } from "#/shared/redis/client";
import { nanoid } from "nanoid";
import { CRYPTO_PAY_API } from "#/shared/api/crypto-api";
import type { ExchangeRate, InvoiceType } from "#/shared/types/payment/payment-types";
import type * as z from "zod/v4"
import { getRedisKey } from "#/helpers/redis";
import type { OrderSingleDefault } from "@repo/shared/types/entities/store";
import { invariant } from "#/helpers/invariant";
import { type Static, t } from "elysia";

export const exchangeRates = {
  async getList() {
    const redis = getRedis()
    return redis.get(EXCHANGE_RATES_KEY)
  }
}

async function getPriceInCurrency(input: number, currency: z.infer<typeof currencyCryptoSchema>): Promise<number> {
  const data = await exchangeRates.getList()
  invariant(data, "Exchange rates cache is not defined")

  const rates: ExchangeRate[] = JSON.parse(data)

  const target = rates.find(
    t => t.source === currency && t.target === "RUB"
  )

  invariant(target, "Selected wallet is not corrected")

  function extractDiff(rubPrice: number, exchangeRate: number): number {
    const priceInTargetCurrency = rubPrice / exchangeRate;
    return parseFloat(priceInTargetCurrency.toFixed(8));
  }

  return extractDiff(input, Number(target.rate));
}

type CreateInvoicePayload = Pick<InvoiceType,
  | "currency_type"
  | "asset"
  | "amount"
  | "description"
  | "hidden_message"
  | "paid_btn_name"
  | "paid_btn_url"
  | "payload"
> & {
  expires_in?: number
}

type CreateCryptoOrder = {
  totalPrice: number;
  asset: z.infer<typeof currencyCryptoSchema>,
  initiator: string,
  recipient: string,
  target: CreateOrderTopUpSchema["target"],
  value: CreateOrderTopUpSchema["value"],
  comment: CreateOrderTopUpSchema["comment"]
}

export type CryptoPayPayload<T> = { ok: boolean, result: T }

const DEFAULT_EXPIRATION_DATE = 10 * 60

async function validateOrderLimit(initiator: string): Promise<boolean> {
  const ORDER_LIMIT = 64;
  const WINDOW_SECONDS = 10 * 60;

  const redis = getRedis();
  const key = getOrderRateKey(initiator)

  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, WINDOW_SECONDS);
  }

  return count <= ORDER_LIMIT;
}

async function rollbackOrder({
  invoiceId, uniqueId, initiator
}: {
  invoiceId: number, uniqueId: string, initiator: string
}): Promise<void> {
  const redis = getRedis();

  const deleteInvoice = await CRYPTO_PAY_API
    .post(`deleteInvoice`, { json: { invoice_id: invoiceId } })
    .json<CryptoPayPayload<boolean>>()

  if (!deleteInvoice.ok) {
    throw new Error("Transaction is failed")
  }

  const results = await redis.multi()
    .del(getOrderKey(uniqueId))
    .del(getOrderInitiatorIndexKey(initiator))
    .exec()

  if (!results) {
    return;
  }

  const [orderErr, orderInitiatorErr] = results

  console.log(
    orderErr, orderInitiatorErr
  )
}
async function createCryptoOrder({
  totalPrice, asset, initiator, value, target, comment
}: CreateCryptoOrder) {
  const allowed = await validateOrderLimit(initiator);
  if (!allowed) throw new Error("ORDERS_LIMIT");

  const redis = getRedis()

  const uniqueId = nanoid(10)
  const callbackUrl = getOrderLink(uniqueId)
  const description = `Заказ #${uniqueId}. Подробнее о заказе: ${callbackUrl}`;
  const price = totalPrice.toString()
  const payload = `Покупка ${value} ${target} за ${price} ${asset}`

  const createInvoicePayload: CreateInvoicePayload = {
    currency_type: "crypto",
    asset,
    amount: price,
    description,
    paid_btn_name: "callback",
    paid_btn_url: callbackUrl,
    payload,
    expires_in: DEFAULT_EXPIRATION_DATE
  }

  const createdInvoice = await CRYPTO_PAY_API
    .post("createInvoice", { json: createInvoicePayload })
    .json<CryptoPayPayload<InvoiceType>>()

  const orderKey = getOrderKey(uniqueId)

  const orderData: OrderSingleDefault = {
    unique_id: uniqueId,
    asset,
    price,
    created_at: new Date().toISOString(),
    status: "pending",
    payload,
    order_id: createdInvoice.result.hash,
    invoice_id: createdInvoice.result.invoice_id,
    pay_url: createdInvoice.result.pay_url,
    initiator,
    comment
  }

  const success = await redis.set(
    orderKey,
    JSON.stringify(orderData),
    "EX",
    DEFAULT_EXPIRATION_DATE
  )

  const indexRecipientKey = getOrderInitiatorIndexKey(initiator)

  await redis.sadd(indexRecipientKey, orderKey);
  await redis.expire(indexRecipientKey, DEFAULT_EXPIRATION_DATE);

  if (!success) {
    await rollbackOrder({
      uniqueId, invoiceId: createdInvoice.result.invoice_id, initiator
    });

    throw new Error("Failed to insert order into database.");
  }

  const data = {
    ...createdInvoice,
    result: {
      ...createdInvoice.result,
      uniqueId: uniqueId
    }
  }

  return data
}

export const createOrderPayloadSchema = t.Object({
  url: t.String(),
  orderId: t.String(),
  invoiceId: t.Number(),
  totalPrice: t.Number(),
  uniqueId: t.String(),
})

export type CreateOrderPayload = Static<typeof createOrderPayloadSchema>;

export const cryptobot = {
  async start({
    recipient, method: { currency }, comment, target, value, initiator
  }: OrderInputPayload): Promise<CreateOrderPayload> {
    const { success: isCrypto, data: asset } = currencyCryptoSchema.safeParse(currency);
    if (!isCrypto) {
      throw new Error("Incorrect currency");
    }

    const economyTarget = await getEconomyByTarget(target);

    const totalValue = value * Number(economyTarget.value)
    const totalPrice = await getPriceInCurrency(totalValue, asset)

    const input = {
      totalPrice, target, value, asset, recipient, initiator, comment
    }

    const payment = await createCryptoOrder(input);
    if (!payment.ok) {
      throw new Error("Failed in creating order");
    }

    const { invoice_id: invoiceId, hash: orderId, pay_url: url, uniqueId } = payment.result

    const data = { invoiceId, orderId, url, uniqueId, totalPrice };
    return data
  }
}

export const EXCHANGE_RATES_KEY = getRedisKey("external", "exchange-rates:data");
const EXCHANGE_RATES_PREVIOUS_KEY = getRedisKey("external", "exchange-rates:data:previous");

export async function updateExchangeRates() {
  const redis = getRedis();

  try {
    const data = await CRYPTO_PAY_API
      .get("getExchangeRates")
      .json<CryptoPayPayload<ExchangeRate[]>>()

    if (!data.ok) throw new Error()

    const value = JSON.stringify(data.result);
    const current = await redis.get(EXCHANGE_RATES_KEY);

    if (current) {
      await redis.set(EXCHANGE_RATES_PREVIOUS_KEY, current);
    }

    await redis.set(EXCHANGE_RATES_KEY, value);
  } catch (e) {
    const exists = await redis.exists(EXCHANGE_RATES_KEY);

    if (!exists) {
      const fallback = await redis.get(EXCHANGE_RATES_PREVIOUS_KEY);

      if (fallback) {
        await redis.set(EXCHANGE_RATES_KEY, fallback);
      }
    }
  }
}

export async function getExchangeRatesStore(
  storeRates: { type: string, value: string }[],
  realExchangeRates: ExchangeRate[]
): Promise<StoreExchangeRatesPayload> {
  const TARGETS = ["RUB", "UAH", "KZT"] as const
  type TargetFiat = typeof TARGETS[number]

  function isTargetFiat(v: string): v is TargetFiat {
    return (TARGETS as readonly string[]).includes(v)
  }

  const rateMap: Partial<Record<TargetFiat, number>> = {}

  for (const r of realExchangeRates) {
    if (r.source === "USDT" && isTargetFiat(r.target)) {
      const parsedRate = Number(r.rate)
      if (!Number.isFinite(parsedRate)) continue
      rateMap[r.target] = parsedRate
    }
  }

  for (const t of TARGETS) {
    if (!rateMap[t]) {
      throw new Error("Incorrect target")
    }
  }

  const result = storeRates.reduce((acc, item) => {
    const key = item.type as GameCurrency

    const valueNum = Number(item.value)

    if (!Number.isFinite(valueNum)) {
      throw new Error("Incorrect number of store economy key")
    }

    const rubPerUsdt = rateMap.RUB as number
    const uahPerUsdt = rateMap.UAH as number
    const kztPerUsdt = rateMap.KZT as number

    const per = {
      USDT: valueNum / rubPerUsdt,
      RUB: valueNum,
      UAH: valueNum * (uahPerUsdt / rubPerUsdt),
      KZT: valueNum * (kztPerUsdt / rubPerUsdt),
    }

    acc[key] = per
    return acc
  }, {} as StoreExchangeRatesPayload)

  return result
}
