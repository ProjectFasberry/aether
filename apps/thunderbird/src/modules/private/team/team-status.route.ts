import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { setApplicationStatus, teamStatusSchema } from "#/modules/team/team.model";

const statusBodySchema = t.Object({
  status: teamStatusSchema,
});

export const teamStatus = new Elysia()
  .use(validatePermission("team.applications.update", { withExternal: true }))
  .post("/:id/status", async ({ params: { id }, body, status }) => {
    const row = await setApplicationStatus(Number(id), body.status);
    if (!row) throw status(404, { error: "APPLICATION_NOT_FOUND" });

    return { data: row };
  }, {
    params: t.Object({ id: t.String() }),
    body: statusBodySchema,
    response: {
      200: withData(t.Object({ id: t.Number(), status: teamStatusSchema })),
      404: withError(),
    },
    detail: {
      summary: buildRouteSummary("Move a team application status"),
    },
  });
