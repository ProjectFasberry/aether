import Elysia from "elysia";
import { achievementsPayloadSchema, getAchievements } from "./achievements.model";
import { withData } from "#/shared/schemas";

export const achievementsByPlayer = new Elysia()
  .get("/:nickname", async ({ params: { nickname } }) => {
    const data = await getAchievements(nickname)
    return { data }
  }, {
    response: {
      200: withData(
        achievementsPayloadSchema
      )
    }
  })
