import Elysia, { type Static, t } from "elysia";
import { general } from "#/shared/database/general-db";
import { validatePermission } from "#/lib/validators";
import { Permissions } from "#/shared/constants/permissions";
import { createAdminActivityLog } from "../private.model";
import { withData } from "#/shared/schemas";

const updateOptionsSchema = t.Object({
  value: t.Boolean()
})

async function updateOptions(name: string, { value }: Static<typeof updateOptionsSchema>) {
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
    },
    response: {
      200: withData(
        t.Object({
          value: t.Boolean()
        })
      )
    }
  })