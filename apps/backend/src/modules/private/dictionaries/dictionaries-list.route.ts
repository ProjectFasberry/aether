import { validatePermission } from "#/lib/validators"
import { Permissions } from "#/shared/constants/permissions"
import { general } from "#/shared/database/general-db"
import { withData } from "#/shared/schemas"
import Elysia, { t } from "elysia"

export const dictionariesList = new Elysia()
  .use(validatePermission(Permissions.get("DICTIONARIES.READ")))
  .get("/list", async (ctx) => {
    const data = await general
      .selectFrom("dictionaries")
      .selectAll()
      .execute()

    return { data: data.map(d => ({ ...d, created_at: d.created_at.toString() })) }
  }, {
    response: {
      200: withData(
        t.Array(
          t.Object({
            id: t.Number(),
            value: t.String(),
            created_at: t.String(),
            key: t.String()
          })
        )
      )
    }
  })