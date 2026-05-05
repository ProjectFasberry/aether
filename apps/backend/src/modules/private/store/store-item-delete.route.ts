import Elysia from "elysia";
import { general } from "#/shared/database/general-db";
import * as z from "zod/v4"
import { validatePermission } from "#/lib/validators";
import { Permissions } from "#/shared/constants/permissions";
import { createAdminActivityLog } from "../private.model";

async function removeStoreItem(id: number) {
  const query = await general
    .deleteFrom("store_items")
    .where("id", "=", id)
    .returning("id")
    .executeTakeFirstOrThrow()

  return query;
}

export const storeItemDelete = new Elysia()
  .use(validatePermission(Permissions.get("STORE.ITEM.DELETE")))
  .delete("/:id", async ({ params: { id } }) => {
    const data = await removeStoreItem(id);
    return { data }
  }, {
    params: z.object({ id: z.coerce.number() }),
    afterResponse: ({ nickname: initiator, permission }) => {
      createAdminActivityLog({ initiator, event: permission })
    }
  })