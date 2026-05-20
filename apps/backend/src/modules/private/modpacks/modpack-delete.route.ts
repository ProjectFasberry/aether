import { validatePermission } from "#/lib/validators";
import { Permissions } from "#/shared/constants/permissions";
import { general } from "#/shared/database/general-db";
import Elysia, { t } from "elysia";
import { createAdminActivityLog } from "../private.model";
import { withData } from "#/shared/schemas";

async function deleteModpack(id: number) {
  const query = await general
    .deleteFrom("modpacks")
    .where("id", "=", id)
    .returning("id")
    .executeTakeFirstOrThrow();

  return query;
}

export const modpackDelete = new Elysia()
  .use(validatePermission(Permissions.get("MODPACKS.DELETE")))
  .delete("/:id", async ({ params: { id } }) => {
    await deleteModpack(id)
    return { data: "OK" }
  }, {
    params: t.Object({ id: t.Number() }),
    afterResponse: ({ nickname: initiator, permission }) => {
      createAdminActivityLog({ initiator, event: permission })
    },
    response: {
      200: withData(
        t.Literal("OK")
      )
    }
  })
