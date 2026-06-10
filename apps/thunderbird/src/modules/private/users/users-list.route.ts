import Elysia from "elysia";
import { withData } from "#/shared/schemas";
import { validatePermission } from "#/lib/validators";
import { permissions } from "#/shared/constants/permissions";
import { getPlayersList, privatedUsersSchema, userListSchema } from "./users-list.model";
import { buildRouteSummary } from "#/utils";

export const playersList = new Elysia()
  .use(validatePermission(permissions.get("PLAYERS.READ"), { withExternal: true }))
  .get("/list", async ({ query }) => {
    const data = await getPlayersList(query);
    return { data }
  }, {
    query: userListSchema,
    response: {
      200: withData(privatedUsersSchema)
    },
    detail: {
      summary: buildRouteSummary("Get players list")
    }
  })
