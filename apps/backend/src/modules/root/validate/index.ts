import { defineUser } from "#/lib/define";
import { general } from "#/shared/database/general-db";
import { withData } from "#/shared/schemas";
import Elysia, { t } from "elysia";
import { banSchema, getBan } from "../app/app-options.route";

const validateNickname = new Elysia()
  .get("/nickname/:nickname", async ({ params: { nickname } }) => {
    const query = await general
      .selectFrom("players")
      .select("nickname")
      .where("nickname", "=", nickname)
      .executeTakeFirst()

    const data = query?.nickname ? "OK" : null
    return { data }
  }, {
    response: {
      200: withData(
        t.Union([t.Literal("OK"), t.Null()])
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
        t.Nullable(banSchema)
      )
    }
  })

export const validateGroup = new Elysia()
  .group("/validate", app => app
    .use(validateNickname)
    .use(banStatus)
  )