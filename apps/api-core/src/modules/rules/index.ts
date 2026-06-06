import Elysia, { type Static, t } from "elysia";
import { withData } from "#/shared/schemas";
import { getRules, rulesPayloadSchema } from "./rules.model";

const rulesTagsPayloadSchema = t.Array(
  t.Object({
    title: t.String(),
    value: t.String()
  })
)

const rulesTags = new Elysia()
  .get("/tags", async () => {
    const data: Static<typeof rulesTagsPayloadSchema> = [
      { title: "Правила", value: "rules" },
      { title: "База", value: "main" },
      { title: "кодекс", value: "codex" },
      { title: "никтонечитает", value: "nothingtoread" }
    ]

    return { data }
  }, {
    response: {
      200: withData(rulesTagsPayloadSchema)
    }
  })

export const rulesList = new Elysia()
  .get("/list", async ({ set }) => {
    const data = await getRules()

    set.headers["Cache-Control"] = "public, max-age=60, s-maxage=60"
    set.headers["vary"] = "Origin";

    return { data }
  }, {
    response: {
      200: withData(rulesPayloadSchema)
    }
  })

export const rules = new Elysia()
  .group("/rules", app => app
    .use(rulesList)
    .use(rulesTags)
  )
