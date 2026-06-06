import { general } from "#/shared/database/general-db"
import { t } from "elysia"

export async function getRules() {
  const rules = await general
    .selectFrom("rules")
    .selectAll()
    .orderBy("created_at", "asc")
    .execute()

  return rules
}

export const rulesPayloadSchema = t.Array(
  t.Object({
    id: t.Number(),
    created_at: t.Date(),
    updated_at: t.Nullable(t.Date()),
    content: t.Any(),
    category: t.String()
  })
)
