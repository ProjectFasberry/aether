import Elysia from "elysia";
import { withData } from "#/shared/schemas";
import { validatePermission } from "#/lib/validators";
import { Permissions } from "#/shared/constants/permissions";
import { getPlayersList, privatedUsersSchema, userListSchema } from "./users-list.model";

export const playersList = new Elysia()
  .use(validatePermission(Permissions.get("PLAYERS.READ")))
  .get("/list", async ({ query }) => {
    const data = await getPlayersList(query);
    return { data }
  }, {
    query: userListSchema,
    response: {
      200: withData(privatedUsersSchema)
    }
  })