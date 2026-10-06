import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { permissionsService } from "#/shared/constants/permissions";
import { withData } from "#/shared/schemas";
import { getPlayer, privatedUserSchema } from "./users-list.model";
import { buildRouteSummary } from "#/utils";

export const playersSingle = new Elysia()
  .use(validatePermission(permissionsService.get("PLAYERS.READ")))
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
