import { defineRequiredUser } from "#/lib/define"
import { general } from "#/shared/database/general-db"
import Elysia, { type Static, t } from "elysia"
import { withData } from "#/shared/schemas"
import { skinsService } from "../skin/index.model"
import { buildRouteSummary } from "#/utils"

const referralsListSchema = t.Array(
  t.Object({
    id: t.Number(),
    created_at: t.String(),
    completed: t.Boolean(),
    referral: t.Object({
      nickname: t.String(),
      avatar: t.String()
    })
  })
)

async function getReferals(nickname: string): Promise<Static<typeof referralsListSchema>> {
  const query = await general
    .selectFrom("referrals")
    .select([
      "id",
      "created_at",
      "completed",
      "referral"
    ])
    .where("referrer", "=", nickname)
    .execute()

  const avatarsMap = await skinsService.players.getAvatar(query.map(r => r.referral));

  const data = await Promise.all(
    query.map(async (row) => ({
      id: row.id,
      created_at: row.created_at.toString(),
      completed: row.completed,
      referral: {
        nickname: row.referral,
        avatar: avatarsMap[row.referral]
      }
    }))
  )

  return data
}

const referralsList = new Elysia()
  .use(defineRequiredUser())
  .get("/list", async ({ nickname }) => {
    const data = await getReferals(nickname)
    return { data }
  }, {
    response: {
      200: withData(referralsListSchema)
    },
    detail: {
      summary: buildRouteSummary("List referrals")
    }
  })

export const referrals = new Elysia()
  .group("/referrals", app => app
    .use(referralsList)
  )
