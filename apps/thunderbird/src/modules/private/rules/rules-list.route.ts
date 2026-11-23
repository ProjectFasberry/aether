import Elysia from "elysia";
import { validatePermission } from "#/lib/validators";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { getRules, rulesPayloadSchema } from "#/modules/rules/rules.model";

export const rulesList = new Elysia()
  .use(validatePermission("rules.read"))
  .get("/list", async () => {
    return { data: await getRules() };
  }, {
    response: {
      200: withData(rulesPayloadSchema),
    },
    detail: {
      summary: buildRouteSummary("List the editable project rules"),
    },
  });
