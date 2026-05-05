import Elysia from "elysia";
import type * as z from "zod/v4"
import { general } from "#/shared/database/general-db";
import { validatePermission } from "#/lib/validators";
import { Permissions } from "#/shared/constants/permissions";
import { createAdminActivityLog } from "../private.model";
import { storeItemCreateSchema } from "@repo/shared/schemas/store";

async function createStoreItem(values: z.infer<typeof storeItemCreateSchema>) {
  const query = await general
    .insertInto("store_items")
    .values(values)
    .returningAll()
    .executeTakeFirst()

  return query;
}

export const storeItemCreate = new Elysia()
  .use(validatePermission(Permissions.get("STORE.ITEM.CREATE")))
  .post("/create", async ({ body }) => {
    const data = await createStoreItem(body)
    return { data }
  }, {
    body: storeItemCreateSchema,
    afterResponse: ({ permission, nickname: initiator }) => {
      createAdminActivityLog({ initiator, event: permission })
    }
  })