import Elysia from "elysia";
import { validatePermission } from "#/lib/validators";
import { Permissions } from "#/shared/constants/permissions";
import { general } from "#/shared/database/general-db";

async function getUser(nickname: string) {
  const query = await general
    .selectFrom('players')
    .selectAll()
    .where("nickname", "=", nickname)
    .executeTakeFirst()

  return query ?? null;
}

export const playersSingle = new Elysia()
  .use(validatePermission(Permissions.get("PLAYERS.READ")))
  .get("/:nickname", async ({ params: { nickname } }) => {
    const data = await getUser(nickname);
    return { data }
  })