import Elysia, { t } from "elysia";
import { general } from "#/shared/database/general-db";
import { withData } from "#/shared/schemas";

async function getRules() {
  const rules = await general
    .selectFrom("rules")
    .selectAll()
    .orderBy("created_at", "asc")
    .execute()

  return rules
}

const rulesPayload = t.Array(
  t.Object({
    id: t.Number(),
    created_at: t.Date(),
    updated_at: t.Nullable(t.Date()),
    content: t.Any(),
    category: t.String()
  })
)

const rulesTags = new Elysia()
  .get("/tags", async () => {
    const data = [
      { title: "Правила", value: "rules" },
      { title: "База", value: "main" },
      { title: "кодекс", value: "codex" },
      { title: "никтонечитает", value: "nothingtoread" }
    ]

    return { data }
  }, {
    response: {
      200: withData(
        t.Array(
          t.Object({
            title: t.String(),
            value: t.String()
          })
        )
      )
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
      200: withData(rulesPayload)
    }
  })

export const rules = new Elysia()
  .group("/rules", app => app
    .use(rulesList)
    .use(rulesTags)
  )
