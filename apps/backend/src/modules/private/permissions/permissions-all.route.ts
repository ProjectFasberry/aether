import { validatePermission } from "#/lib/validators";
import { Permissions } from "#/shared/constants/permissions";
import { general } from "#/shared/database/general-db";
import Elysia from "elysia";

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
  })