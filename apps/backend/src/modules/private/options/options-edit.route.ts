import Elysia from "elysia";
import * as z from "zod/v4";
import { general } from "#/shared/database/general-db";
import { validatePermission } from "#/lib/middlewares/validators";
import { Permissions } from "#/shared/constants/permissions";
import { createAdminActivityLog } from "../private.model";

const updateOptionsSchema = z.object({
  value: z.boolean()
})

async function updateOptions(name: string, { value }: z.infer<typeof updateOptionsSchema>) {
  const query = await general
    .updateTable("options")
    .set({ name, value })
    .where("name", "=", name)
    .returning("value")
    .executeTakeFirstOrThrow()

  return query;
}

export const optionsUpdate = new Elysia()
  .use(validatePermission(Permissions.get("OPTIONS.UPDATE")))
  .post("/:name/edit", async ({ params: { name }, body }) => {
    const data = await updateOptions(name, body);
    return { data }
  }, {
    body: updateOptionsSchema,
    afterResponse: ({ nickname: initiator, permission }) => {
      createAdminActivityLog({ initiator, event: permission })
    }
  })