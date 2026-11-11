import Elysia from "elysia"
import { getLands, landsListPayload, landsSchema } from "./lands.model"
import { withData } from "#/shared/schemas"
import { buildRouteSummary } from "#/lib/routes"
import { cached } from "#/shared/cache/ttl"

const LIST_CACHE_TTL_MS = 30_000

export const landsList = new Elysia()
  .get("/list", async ({ query }) => {
    const data = await cached(
      `lands:list:${JSON.stringify(query)}`,
      LIST_CACHE_TTL_MS,
      () => getLands(query),
    )

    return { data }
  }, {
    query: landsSchema,
    response: {
      200: withData(landsListPayload)
    },
    detail: {
      summary: buildRouteSummary("Get lands list")
    }
  })
