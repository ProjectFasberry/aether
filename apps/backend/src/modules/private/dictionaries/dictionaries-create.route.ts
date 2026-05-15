import { validatePermission } from "#/lib/validators";
import { Permissions } from "#/shared/constants/permissions";
import { general } from "#/shared/database/general-db";
import Elysia, { t } from "elysia";
import { createAdminActivityLog } from "../private.model";

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
    body: t.Object({
      key: t.UnionEnum(["title", "key"]),
      value: t.String()
    }),
    afterResponse: ({ permission, nickname: initiator }) => {
      createAdminActivityLog({ initiator, event: permission })
    }
  })
