import { validatePermission } from "#/lib/validators"
import { Permissions } from "#/shared/constants/permissions"
import { general } from "#/shared/database/general-db"
import { withData } from "#/shared/schemas";
import Elysia, { t } from "elysia"

async function getOptions() {
  const query = await general
    .selectFrom("options")
    .select([
      "name",
      "value",
      "title"
    ])
    .execute();
    
  return query
}

export const optionsList = new Elysia()
  .use(validatePermission(Permissions.get("OPTIONS.READ")))
  .get("/list", async () => {
    const data = await getOptions()
    return { data }
  }, {
    response: {
      200: withData(
        t.Array(
          t.Object({
            name: t.String(),
            value: t.String(),
            title: t.String()
          })
        )
      )
    }
  })