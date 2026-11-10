import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { withData } from "#/shared/schemas";
import { getPlayer, privatedUserSchema } from "./users-list.model";
import { buildRouteSummary } from "#/lib/routes";

export const playersSingle = new Elysia()
  .use(validatePermission("players.read"))
  .get("/:nickname", async ({ params: { nickname } }) => {
    const data = await getPlayer(nickname);
    return { data }
  }, {
    params: t.Object({
      nickname: t.String({ minLength: 1 })
    }),
    response: {
      200: withData(privatedUserSchema)
    },
    detail: {
      summary: buildRouteSummary("Get player by nickname")
    }
  })
