import { defineUser } from "#/lib/define"
import { general } from "#/shared/database/general-db"
import Elysia, { type Static, t } from "elysia"
import { getPlayerAvatar } from "../skin/skin.model"
import { withData } from "#/shared/schemas"

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

  const data = await Promise.all(
    query.map(async (row) => ({
      id: row.id,
      created_at: row.created_at.toString(),
      completed: row.completed,
      referral: {
        nickname: row.referral,
        avatar: await getPlayerAvatar(row.referral)
      }
    }))
  )

  return data
}

const referralsList = new Elysia()
  .use(defineUser())
  .get("/list", async ({ nickname }) => {
    const data = await getReferals(nickname)
    return { data }
  }, {
    response: {
      200: withData(referralsListSchema)
    }
  })

export const referrals = new Elysia()
  .group("/referrals", app => app
    .use(referralsList)
  )