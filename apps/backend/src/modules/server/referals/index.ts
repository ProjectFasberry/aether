import { defineUser } from "#/lib/middlewares/define"
import { general } from "#/shared/database/general-db"
import Elysia from "elysia"
import { getPlayerAvatar } from "../skin/skin.model"

async function getReferals(nickname: string) {
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
      created_at: row.created_at,
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
  })

export const referrals = new Elysia()
  .group("/referrals", app => app
    .use(referralsList)
  )