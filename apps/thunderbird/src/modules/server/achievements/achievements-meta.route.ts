import Elysia from "elysia";
import { achievementsMetaPayloadSchema, getAchievementsMeta } from "./achievements.model";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";

export const achievementsMeta = new Elysia()
  .get("/meta", async (ctx) => {
    const data = await getAchievementsMeta()
    return { data }
  }, {
    response: {
      200: withData(
        achievementsMetaPayloadSchema
      )
    },
    detail: {
      summary: buildRouteSummary("Get achievements meta")
    }
  })
