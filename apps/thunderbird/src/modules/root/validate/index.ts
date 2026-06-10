import { defineRequiredUser } from "#/lib/define";
import { general } from "#/shared/database/general-db";
import { withData } from "#/shared/schemas";
import Elysia, { t } from "elysia";
import { banSchema, getBan } from "../app/app-options.route";
import { buildRouteSummary } from "#/utils";

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
    },
    detail: {
      summary: buildRouteSummary("Validate nickname")
    }
  })

const banStatus = new Elysia()
  .use(defineRequiredUser())
  .get("/ban", async ({ nickname }) => {
    const data = await getBan(nickname)
    return { data }
  }, {
    response: {
      200: withData(
        t.Nullable(banSchema)
      )
    },
    detail: {
      summary: buildRouteSummary("Get ban status")
    }
  })

export const validateGroup = new Elysia()
  .group("/validate", app => app
    .use(validateNickname)
    .use(banStatus)
  )
