import Elysia from "elysia"
import { getLands, landsListPayload, landsSchema } from "./lands.model"
import { withData } from "#/shared/schemas"
import { buildRouteSummary } from "#/utils"

export const landsList = new Elysia()
  .get("/list", async ({ query }) => {
    const data = await getLands(query)
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
