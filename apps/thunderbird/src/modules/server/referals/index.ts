import { defineRequiredUser } from "#/lib/define"
import { general } from "#/shared/database/general-db"
import Elysia, { type Static, t } from "elysia"
import { withData } from "#/shared/schemas"
import { skinsService } from "../../../shared/services/skins"
import { buildRouteSummary } from "#/lib/routes"
import { DateTime } from "#/helpers/typebox"
import { withError } from "#/shared/schemas"
import { createReferralLink, linkError, referralStats } from "#/modules/auth/player-links.model"
import { wrapError } from "@repo/shared/lib/helpers"

const referralsListSchema = t.Array(
  t.Object({
    id: t.Number(),
    created_at: DateTime,
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
      created_at: row.created_at,
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

const referralStatsSchema = t.Object({
  used: t.Number(),
  remaining: t.Number(),
  limit: t.Number(),
})

const referralsStats = new Elysia()
  .use(defineRequiredUser())
  .get("/me", async ({ nickname }) => {
    const data = await referralStats(nickname)
    return { data }
  }, {
    response: {
      200: withData(referralStatsSchema)
    },
    detail: {
      summary: buildRouteSummary("Get referral stats")
    }
  })

const referralsLink = new Elysia()
  .use(defineRequiredUser())
  .post("/link", async ({ nickname, status }) => {
    try {
      const stats = await referralStats(nickname)

      if (stats.remaining <= 0) throw linkError.raise("REFERRAL_LIMIT")

      const link = await createReferralLink({ referrer: nickname, createdBy: nickname })

      return {
        data: {
          token: link.token,
          expires_at: link.expiresAt,
          ...stats,
        }
      }
    } catch (error) {
      const err = linkError.reader(error)
      return status(err.code as 409 | 500, wrapError(err.msg))
    }
  }, {
    response: {
      200: withData(
        t.Object({
          token: t.String(),
          expires_at: DateTime,
          used: t.Number(),
          remaining: t.Number(),
          limit: t.Number(),
        })
      ),
      409: withError(t.String()),
      500: withError(t.String()),
    },
    detail: {
      summary: buildRouteSummary("Create referral link")
    }
  })

export const referrals = new Elysia()
  .group("/referrals", app => app
    .use(referralsList)
    .use(referralsStats)
    .use(referralsLink)
  )
