import { validatePermission } from "#/lib/validators";
import { Permissions } from "#/shared/constants/permissions";
import { general } from "#/shared/database/general-db";
import { withData } from "#/shared/schemas";
import Elysia, { t } from "elysia";

async function getPermissions() {
  const query = await general
    .selectFrom("permissions")
    .selectAll()
    .execute()

  return query
}

export const permissionsListAll = new Elysia()
  .use(validatePermission(Permissions.get("PERMISSIONS.READ")))
  .get("/list/all", async () => {
    const data = await getPermissions();
    return { data }
  }, {
    response: {
      200: withData(
        t.Array(
          t.Object({
            name: t.String(),
            id: t.Number()
          })
        )
      )
    }
  })