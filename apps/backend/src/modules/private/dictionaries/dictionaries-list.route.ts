import { validatePermission } from "#/lib/validators"
import { Permissions } from "#/shared/constants/permissions"
import { general } from "#/shared/database/general-db"
import Elysia from "elysia"

export const dictionariesList = new Elysia()
  .use(validatePermission(Permissions.get("DICTIONARIES.READ")))
  .get("/list", async (ctx) => {
    const data = await general
      .selectFrom("dictionaries")
      .selectAll()
      .execute()

    return { data }
  })