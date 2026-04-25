import { general } from "#/shared/database/general-db"
import type { StoreExchangeRatesPayload } from "@repo/shared/schemas/payment"
import Elysia, { t } from "elysia"
import { getExchangeRates } from "../order/create-crypto-order"
import { safeJsonParse } from "#/utils/config/transforms"
import type { ExchangeRate } from "#/shared/types/payment/payment-types"
import { wrapError } from "#/helpers/wrap-error"
import { withData, withError } from "#/shared/schemas"
import { getExchangeRatesStore } from "./exchange-rates.model"

export const exchangeRates = new Elysia()
  .get("/exchange-rates", async ({ status }) => {
    const query = await general
      .selectFrom("store_economy")
      .select(["value", "type"])
      .execute()

    const exchangeRatesStr = await getExchangeRates()
    if (!exchangeRatesStr) {
      throw status(500, wrapError("EXCHANGES_NOT_FOUND"))
    }

    const parsed = safeJsonParse<ExchangeRate[]>(exchangeRatesStr)
    if (!parsed.ok) {
      throw status(500, wrapError("STRUCTURE_INCORRECT"))
    }

    const exchangeRates = parsed.value
    const data: StoreExchangeRatesPayload = await getExchangeRatesStore(query, exchangeRates)

    return { data }
  }, {
    response: {
      200: withData(
        t.Record(
          t.String(),
          t.Record(
            t.String(), t.Number()
          )
        )
      ),
      500: withError
    }
  })