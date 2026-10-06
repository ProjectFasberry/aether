import { validatePermission } from "#/lib/validators";
import { permissionsService } from "#/shared/constants/permissions";
import { withData, withError } from "#/shared/schemas";
import Elysia, { t } from "elysia";
import { getOptions, optionSchema } from "./options.model";
import { buildRouteSummary } from "#/utils";

export const optionsList = new Elysia()
  .use(validatePermission(permissionsService.get("OPTIONS.READ"), { withExternal: true }))
  .get("/list", async () => {
    const data = await getOptions();
    return { data };
  }, {
    response: {
      200: withData(t.Array(optionSchema)),
      500: withError(),
    },
    detail: {
      summary: buildRouteSummary("List all options"),
    },
  });
