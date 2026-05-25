import { validatePermission } from "#/lib/validators";
import { Permissions } from "#/shared/constants/permissions";
import { general } from "#/shared/database/general-db";
import Elysia, { t } from "elysia";
import { createAdminActivityLog } from "../private.model";
import { withData } from "#/shared/schemas";

async function deleteNews(id: number) {
  const query = await general
    .deleteFrom("news")
    .where("id", "=", id)
    .returning(["id"])
    .executeTakeFirstOrThrow()

  return query
}

export const newsDeleteRoute = new Elysia()
  .use(validatePermission(Permissions.get("NEWS.DELETE")))
  .delete("/:id", async ({ status, params: { id } }) => {
    await deleteNews(id);
    return { data: "OK" }
  }, {
    params: t.Object({ id: t.Number() }),
    afterResponse: ({ nickname: initiator, permission }) => {
      createAdminActivityLog({ initiator, event: permission })
    },
    response: {
      200: withData(t.Literal("OK"))
    }
  })
