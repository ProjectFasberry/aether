import Elysia from "elysia";
import { achievementsPayloadSchema, getAchievements } from "./achievements.model";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";

export const achievementsByPlayer = new Elysia()
  .get("/:nickname", async ({ params: { nickname } }) => {
    const data = await getAchievements(nickname)
    return { data }
  }, {
    response: {
      200: withData(
        achievementsPayloadSchema
      )
    },
    detail: {
      summary: buildRouteSummary("Get achievements by player")
    }
  })
