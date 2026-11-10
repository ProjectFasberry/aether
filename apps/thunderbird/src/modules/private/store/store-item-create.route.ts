import Elysia from "elysia";
import type * as z from "zod";
import { general } from "#/shared/database/general-db";
import { validatePermission } from "#/lib/validators";
import { createAdminActivityLog } from "../private.model";
import { storeItemCreateSchema } from "@repo/shared/schemas/store";
import { normalizeStoreCommand } from "@repo/shared/schemas/store/payment";
import { buildRouteSummary } from "#/lib/routes";

async function createStoreItem(values: z.infer<typeof storeItemCreateSchema>) {
  const query = await general
    .insertInto("store_items")
    .values(values)
    .returningAll()
    .executeTakeFirst();

  return query;
}

export const storeItemCreate = new Elysia()
  .use(validatePermission("store.item.create"))
  .post("/create", async ({ body }) => {
    const data = await createStoreItem({
      ...body,
      command: normalizeStoreCommand(body.command),
      refund_cmd: normalizeStoreCommand(body.refund_cmd),
    });
    return { data };
  }, {
    body: storeItemCreateSchema,
    afterResponse: ({ permission, nickname: initiator }) => {
      createAdminActivityLog({ initiator, event: permission });
    },
    detail: {
      summary: buildRouteSummary("Create store item"),
    },
  });
