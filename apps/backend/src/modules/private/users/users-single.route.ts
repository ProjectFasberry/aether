import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { Permissions } from "#/shared/constants/permissions";
import { withData } from "#/shared/schemas";
import { getPlayer, privatedUserSchema } from "./users-list.model";

export const playersSingle = new Elysia()
  .use(validatePermission(Permissions.get("PLAYERS.READ")))
  .get("/:nickname", async ({ params: { nickname } }) => {
    const data = await getPlayer(nickname);
    return { data }
  }, {
    params: t.Object({
      nickname: t.String({ minLength: 1 })
    }),
    response: {
      200: withData(privatedUserSchema)
    }
  })