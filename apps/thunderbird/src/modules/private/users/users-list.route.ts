import Elysia from "elysia";
import { withData, withError } from "#/shared/schemas";
import { validatePermission } from "#/lib/validators";
import { permissionsService } from "#/shared/constants/permissions";
import { getPlayersList, privatedUsersSchema, userListSchema } from "./users-list.model";
import { buildRouteSummary } from "#/utils";

export const playersList = new Elysia()
  .use(validatePermission(permissionsService.get("PLAYERS.READ"), { withExternal: true }))
  .get("/list", async ({ query, status }) => {
    const data = await getPlayersList(query);

    // A cursor can outlive a deploy or come from a different sort; the panel
    // resets its pagination on this error instead of silently showing page one.
    if (!data) return status(400, { error: "INVALID_CURSOR" });

    return { data }
  }, {
    query: userListSchema,
    response: {
      200: withData(privatedUsersSchema),
      400: withError(),
    },
    detail: {
      summary: buildRouteSummary("Get players list")
    }
  })
