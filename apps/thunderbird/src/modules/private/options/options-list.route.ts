import { validatePermission } from "#/lib/validators";
import { withData, withError } from "#/shared/schemas";
import Elysia, { t } from "elysia";
import { getOptions, optionSchema } from "./options.model";
import { buildRouteSummary } from "#/lib/routes";

export const optionsList = new Elysia()
  .use(validatePermission("options.read", { withExternal: true }))
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
