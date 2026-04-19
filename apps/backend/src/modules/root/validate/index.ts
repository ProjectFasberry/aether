import { defineUser } from "#/lib/middlewares/define";
import { general } from "#/shared/database/general-db";
import { withData } from "#/shared/schemas";
import Elysia, { t } from "elysia";
import { getBan } from "../app/app-options.route";

const validateNickname = new Elysia()
  .model({
    "exists": withData(
      t.Nullable(
        t.String()
      )
    )
  })
  .get("/nickname/:nickname", async ({ status, params: { nickname } }) => {
    const query = await general
      .selectFrom("players")
      .select("nickname")
      .where("nickname", "=", nickname)
      .executeTakeFirst()

    const data = query?.nickname ?? null

    return { data }
  })

const banStatus = new Elysia()
  .use(defineUser())
  .model({
    "ban": withData(
      t.Nullable(
        t.Object({
          created_at: t.Date(),
          nickname: t.String(),
          reason: t.Nullable(t.String())
        })
      )
    )
  })
  .get("/ban", async ({ nickname, status }) => {
    const data = await getBan(nickname)
    return status(200, { data })
  }, {
    response: {
      200: "ban"
    }
  })

export const validateGroup = new Elysia()
  .group("/validate", app => app
    .use(validateNickname)
    .use(banStatus)
  )