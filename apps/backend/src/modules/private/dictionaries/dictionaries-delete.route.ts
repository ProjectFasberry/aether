import { validatePermission } from "#/lib/validators";
import { Permissions } from "#/shared/constants/permissions";
import { general } from "#/shared/database/general-db";
import Elysia from "elysia";
import { createAdminActivityLog } from "../private.model";
import * as z from "zod";

export const dictionariesDelete = new Elysia()
  .use(validatePermission(Permissions.get("DICTIONARIES.DELETE")))
  .delete("/:id/remove", async ({ params }) => {
    const id = params.id;

    const data = await general
      .deleteFrom("dictionaries")
      .where("id", "=", id)
      .returning("id")
      .executeTakeFirstOrThrow()

    return { data }
  }, {
    params: z.object({ id: z.coerce.number() }),
    afterResponse: ({ permission, nickname: initiator }) => {
      createAdminActivityLog({ initiator, event: permission })
    }
  })
