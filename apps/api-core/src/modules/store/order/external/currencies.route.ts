import Elysia, { t } from "elysia";
import { getStaticUrl } from "#/helpers/volume";
import { general } from "#/shared/database/general-db";
import { withData } from "#/shared/schemas";

async function getCurrencies() {
  const query = await general
    .selectFrom("currencies")
    .select(["id", "value", "imageUrl", "title", "isAvailable"])
    .where("isPublic", "=", true)
    .execute()

  return query.map((row) => ({ ...row, imageUrl: getStaticUrl(row.imageUrl) }))
}

const currencySchema = t.Object({
  id: t.Number(),
  imageUrl: t.String(),
  isAvailable: t.Boolean(),
  title: t.String(),
  value: t.String(),
})

const currenciesSchema = t.Array(currencySchema);

export const currencies = new Elysia()
  .get("/currencies", async () => {
    const data = await getCurrencies()
    return { data }
  }, {
    response: {
      200: withData(currenciesSchema)
    }
  })