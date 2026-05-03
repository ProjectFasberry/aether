import Elysia, { type Static, t } from "elysia"
import { getStaticUrl } from "#/helpers/volume"
import { general } from "#/shared/database/general-db"
import { withData } from "#/shared/schemas"
import { currencyCryptoSchema } from "@repo/shared/schemas/entities/currencies-schema"
import * as z from "zod/v4"

const methodPayload = t.Object({
  id: t.Number(),
  description: t.Nullable(t.String()),
  imageUrl: t.String(),
  title: t.String(),
  value: t.String(),
  currencies: t.Array(
    t.String()
  )
})

const CRYPTO_METHODS = ["cryptobot", "heleket"];
const SBP_METHODS = ["sbp"];

async function getMethods(): Promise<Static<typeof methodPayload>[]> {
  const query = await general
    .selectFrom("payment_methods")
    .select(["id", "imageUrl", "title", "description", "value"])
    .where("isAvailable", "=", true)
    .execute()

  return query.map((method) => ({
    ...method,
    imageUrl: getStaticUrl(method.imageUrl),
    currencies: CRYPTO_METHODS.includes(method.value)
      ? currencyCryptoSchema.options
      : SBP_METHODS.includes(method.value)
        ? z.enum(['RUB']).options
        : []
  }))
}

export const methodsList = new Elysia()
  .get("/list", async () => {
    const data = await getMethods()
    return { data }
  }, {
    response: {
      200: withData(t.Array(methodPayload))
    }
  })