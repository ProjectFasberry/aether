import { validatePermission } from "#/lib/middlewares/validators";
import { Permissions } from "#/shared/constants/permissions";
import { general } from "#/shared/database/general-db";
import Elysia from "elysia";
import z from "zod";
import { createAdminActivityLog } from "../private.model";

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
    const data = await deleteNews(id);
    return { data }
  }, {
    params: z.object({ id: z.coerce.number() }),
    afterResponse: ({ nickname: initiator, permission }) => {
      createAdminActivityLog({ initiator, event: permission })
    }
  })