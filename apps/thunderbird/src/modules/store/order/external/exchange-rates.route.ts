import { general } from "#/shared/database/general-db"
import Elysia, { t } from "elysia"
import type { ExchangeRate } from "#/shared/types/payment/payment-types"
import { wrapError } from "@repo/shared/lib/helpers";
import { withData, withError } from "#/shared/schemas"
import { exchangeRates, getExchangeRatesStore } from "./cryptobot.model"
import { safeJsonParse } from "#/utils"

const exchangeRatesSchema = t.Record(
  t.String(),
  t.Record(
    t.String(), t.Number()
  )
)

export const exchangeRatesRoute = new Elysia()
  .get("/exchange-rates", async ({ status }) => {
    const query = await general
      .selectFrom("store_economy")
      .select(["value", "type"])
      .execute()

    const exchangeRatesStr = await exchangeRates.getList()
    if (!exchangeRatesStr) throw status(500, wrapError("EXCHANGES_NOT_FOUND"))

    const parsed = safeJsonParse<ExchangeRate[]>(exchangeRatesStr)
    if (!parsed.ok) throw status(500, wrapError("STRUCTURE_INCORRECT"))

    const data = await getExchangeRatesStore(query, parsed.value)
    return { data }
  }, {
    response: {
      200: withData(exchangeRatesSchema),
      500: withError(
        t.UnionEnum([
          "EXCHANGES_NOT_FOUND",
          "STRUCTURE_INCORRECT"
        ])
      )
    }
  })
