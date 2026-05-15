import { validatePermission } from "#/lib/validators";
import { Permissions } from "#/shared/constants/permissions";
import Elysia, { t } from "elysia";
import { createAdminActivityLog } from "../private.model";
import { general } from "#/shared/database/general-db";

export const dictionariesEdit = new Elysia()
  .use(validatePermission(Permissions.get("DICTIONARIES.UPDATE")))
  .post("/:id/edit", async ({ params, body }) => {
    const id = params.id;
    const { key, value } = body;

    const data = await general
      .updateTable("dictionaries")
      .set({
        [key]: value
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow()

    return { data }
  }, {
    body: t.Object({
      key: t.UnionEnum(["title", "key"]),
      value: t.String()
    }),
    params: t.Object({ id: t.Number() }),
    afterResponse: ({ permission, nickname: initiator }) => {
      createAdminActivityLog({ initiator, event: permission })
    }
  })