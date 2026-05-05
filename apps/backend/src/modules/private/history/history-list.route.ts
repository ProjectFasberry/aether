import { validatePermission } from "#/lib/validators";
import { Permissions } from "#/shared/constants/permissions";
import { general } from "#/shared/database/general-db";
import Elysia from "elysia";

export const historyList = new Elysia()
  .use(validatePermission(Permissions.get("HISTORY.READ")))
  .get("/list", async (ctx) => {
    const data = await general
      .selectFrom("admin_activity_log")
      .selectAll()
      .orderBy("created_at", "desc")
      .execute();

    return { data }
  })