import { validatePermission } from "#/lib/validators";
import { Permissions } from "#/shared/constants/permissions";
import { general } from "#/shared/database/general-db";
import { withData } from "#/shared/schemas";
import Elysia, { t } from "elysia";

export const historyList = new Elysia()
  .use(validatePermission(Permissions.get("HISTORY.READ")))
  .get("/list", async (ctx) => {
    const data = await general
      .selectFrom("admin_activity_log")
      .selectAll()
      .orderBy("created_at", "desc")
      .execute();

    return { data: data.map(d => ({ ...d, created_at: d.created_at.toString() })) }
  }, {
    response: {
      200: withData(
        t.Array(
          t.Object({
            id: t.Number(),
            created_at: t.String(),
            event: t.String(),
            initiator: t.String()
          })
        )
      )
    }
  })