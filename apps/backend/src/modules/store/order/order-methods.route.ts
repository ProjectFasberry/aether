import Elysia, { t } from "elysia"
import { getStaticUrl } from "#/helpers/volume"
import { general } from "#/shared/database/general-db"
import { withData } from "#/shared/schemas"
import type { MethodsPayload } from "@repo/shared/types/entities/other"

const methodPayload = t.Object({
  id: t.Number(),
  description: t.Nullable(t.String()),
  imageUrl: t.String(),
  title: t.String(),
  value: t.String(),
})

async function getMethods() {
  let query = await general
    .selectFrom("payment_methods")
    .select(["id", "imageUrl", "title", "description", "value"])
    .where("isAvailable", "=", true)
    .execute()

  query = query.map((method) => ({
    ...method,
    imageUrl: getStaticUrl(method.imageUrl)
  }))
  
  return query
}

export const paymentMethods = new Elysia()
  .get("/methods", async (ctx) => {
    const data: MethodsPayload = await getMethods()
    return { data }
  }, {
    response: {
      200: withData(
        t.Array(methodPayload)
      )
    }
  })