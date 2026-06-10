import { withData } from "#/shared/schemas"
import Elysia from "elysia"
import { getLandsByNickname, landsByNicknameSchema, landsByPlayerSchema } from "./lands.model"
import { buildRouteSummary } from "#/utils"

export const landsByPlayer = new Elysia()
  .get("/list/:nickname", async ({ query, params: { nickname } }) => {
    const data = await getLandsByNickname(nickname, query)
    return { data }
  }, {
    query: landsByNicknameSchema,
    response: {
      200: withData(landsByPlayerSchema)
    },
    detail: {
      summary: buildRouteSummary("Get lands by player")
    }
  })
