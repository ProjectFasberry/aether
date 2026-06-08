import Elysia, { t } from "elysia";
import { general } from "#/shared/database/general-db";
import { validatePermission } from "#/lib/validators";
import { permissions } from "#/shared/constants/permissions";
import { createAdminActivityLog } from "../private.model";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";

async function removeStoreItem(id: number): Promise<{ id: number }> {
  const query = await general
    .deleteFrom("store_items")
    .where("id", "=", id)
    .returning("id")
    .executeTakeFirstOrThrow()

  return query;
}

export const storeItemDelete = new Elysia()
  .use(validatePermission(permissions.get("STORE.ITEM.DELETE")))
  .delete("/:id", async ({ params: { id } }) => {
    const data = await removeStoreItem(id);
    return { data }
  }, {
    params: t.Object({
      id: t.Number()
    }),
    afterResponse: ({ nickname: initiator, permission }) => {
      createAdminActivityLog({ initiator, event: permission })
    },
    response: {
      200: withData(
        t.Object({
          id: t.Number()
        })
      )
    },
    detail: {
      summary: buildRouteSummary("Delete store item")
    }
  })
