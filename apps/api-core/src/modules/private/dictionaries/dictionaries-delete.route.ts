import { validatePermission } from "#/lib/validators";
import { permissions } from "#/shared/constants/permissions";
import { general } from "#/shared/database/general-db";
import Elysia, { t } from "elysia";
import { createAdminActivityLog } from "../private.model";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";

async function deleteDict(id: number) {
  return await general
    .deleteFrom("dictionaries")
    .where("id", "=", id)
    .returning("id")
    .executeTakeFirstOrThrow()
}

export const dictionariesDelete = new Elysia()
  .use(validatePermission(permissions.get("DICTIONARIES.DELETE")))
  .delete("/:id/remove", async ({ params: { id } }) => {
    await deleteDict(id);
    return { data: "OK" }
  }, {
    params: t.Object({ id: t.Number() }),
    afterResponse: ({ permission, nickname: initiator }) => {
      createAdminActivityLog({ initiator, event: permission })
    },
    response: {
      200: withData(
        t.Literal("OK")
      )
    },
    detail: {
      summary: buildRouteSummary("Delete a dictionary entry")
    }
  })
