import { validatePermission } from "#/lib/validators";
import { Permissions } from "#/shared/constants/permissions";
import { general } from "#/shared/database/general-db";
import { withData } from "#/shared/schemas";
import Elysia, { t } from "elysia";

const historySchema =  t.Array(
  t.Object({
    id: t.Number(),
    created_at: t.String(),
    event: t.String(),
    initiator: t.String()
  })
)

async function getHistoryList() {
  const query = await general
    .selectFrom("admin_activity_log")
    .selectAll()
    .orderBy("created_at", "desc")
    .execute();

  return query.map((item) => ({ ...item, created_at: item.created_at.toString() }))
}

export const historyList = new Elysia()
  .use(validatePermission(Permissions.get("HISTORY.READ")))
  .get("/list", async () => {
    const data = await getHistoryList();
    return { data }
  }, {
    response: {
      200: withData(historySchema)
    }
  })
