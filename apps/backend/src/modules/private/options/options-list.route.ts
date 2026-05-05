import { validatePermission } from "#/lib/validators"
import { Permissions } from "#/shared/constants/permissions"
import { general } from "#/shared/database/general-db"
import Elysia from "elysia"

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
  })