import { validatePermission } from "#/lib/middlewares/validators";
import { Permissions } from "#/shared/constants/permissions";
import { general } from "#/shared/database/general-db";
import Elysia from "elysia";
import { createAdminActivityLog } from "../private.model";
import * as z from "zod/v4";

export const dictionariesCreate = new Elysia()
  .use(validatePermission(Permissions.get("DICTIONARIES.CREATE")))
  .post("/create", async ({ body }) => {
    const { key, value } = body;

    const data = await general
      .insertInto("dictionaries")
      .values({
        key, value
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    return { data }
  }, {
    body: z.object({
      key: z.enum(["title", "key"]),
      value: z.string()
    }),
    afterResponse: ({ permission, nickname: initiator }) => {
      createAdminActivityLog({ initiator, event: permission })
    }
  })
