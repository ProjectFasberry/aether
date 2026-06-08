import Elysia from "elysia";
import { validatePermission } from "#/lib/validators";
import { permissions } from "#/shared/constants/permissions";
import { createAdminActivityLog } from "../private.model";
import { withData } from "#/shared/schemas";
import { updateOptions, updateOptionsSchema } from "./options.model";
import { buildRouteSummary } from "#/utils";

export const optionsUpdate = new Elysia()
  .use(validatePermission(permissions.get("OPTIONS.UPDATE")))
  .post("/:name/edit", async ({ params: { name }, body }) => {
    const data = await updateOptions(name, body);
    return { data }
  }, {
    body: updateOptionsSchema,
    afterResponse: ({ nickname: initiator, permission }) => {
      createAdminActivityLog({ initiator, event: permission })
    },
    response: {
      200: withData(updateOptionsSchema)
    },
    detail: {
      summary: buildRouteSummary("Update an option")
    },
  })
