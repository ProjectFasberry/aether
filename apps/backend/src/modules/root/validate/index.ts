import { defineUser } from "#/lib/middlewares/define";
import { general } from "#/shared/database/general-db";
import { withData } from "#/shared/schemas";
import Elysia, { t } from "elysia";
import { getBan } from "../app/app-options.route";

const validateNickname = new Elysia()
  .get("/nickname/:nickname", async ({ params: { nickname } }) => {
    const query = await general
      .selectFrom("players")
      .select("nickname")
      .where("nickname", "=", nickname)
      .executeTakeFirst()

    const data = query?.nickname ?? null

    return { data }
  }, {
    response: {
      200: withData(
        t.Nullable(t.String())
      )
    }
  })

const banStatus = new Elysia()
  .use(defineUser())
  .get("/ban", async ({ nickname }) => {
    const data = await getBan(nickname)
    return { data }
  }, {
    response: {
      200: withData(
        t.Nullable(
          t.Object({
            created_at: t.Date(),
            nickname: t.String(),
            reason: t.Nullable(t.String())
          })
        )
      )
    }
  })

export const validateGroup = new Elysia()
  .group("/validate", app => app
    .use(validateNickname)
    .use(banStatus)
  )