import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { listApplications, teamApplicationSchema, teamStatusSchema } from "#/modules/team/team.model";

const listQuerySchema = t.Object({
  status: t.Optional(teamStatusSchema),
  limit: t.Optional(t.Number({ minimum: 1, maximum: 200 })),
});

export const teamList = new Elysia()
  .use(validatePermission("team.applications.read", { withExternal: true }))
  .get("/list", async ({ query }) => {
    const data = await listApplications(query);
    return { data };
  }, {
    query: listQuerySchema,
    response: {
      200: withData(t.Array(teamApplicationSchema)),
      500: withError(),
    },
    detail: {
      summary: buildRouteSummary("List team applications"),
    },
  });
