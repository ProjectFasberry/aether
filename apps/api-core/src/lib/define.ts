import Elysia from "elysia";
import { auth } from "#/modules/auth/auth.model";
import { general } from "#/shared/database/general-db";
import { SESSION_KEY } from "#/utils/auth/cookie";
import { bearer } from "@elysia/bearer";
import { logValidators } from "#/utils/config/log-utils";

export async function handleByBearer(bearer: string): Promise<boolean> {
  const hash = new Bun.CryptoHasher("sha256").update(bearer).digest("hex");

  const query = await general
    .selectFrom("api_keys")
    .select("id")
    .where("key", "=", hash)
    .executeTakeFirst()

  return Boolean(query?.id)
}

export const defineOptionalUser = () => new Elysia({ name: "defineOptionalUser" })
  .use(defineOptionalSession())
  .derive(async ({ session }): Promise<{ nickname: string | null }> => {
    logValidators("defineOptionalUser");

    const nickname = session ? await auth.getUserNickname(session) : null;
    return { nickname }
  })
  .as("scoped")

export const defineRequiredUser = () => new Elysia({ name: "defineRequiredUser" })
  .use(defineOptionalSession())
  .derive(async ({ session, status }): Promise<{ nickname: string }> => {
    logValidators("defineRequiredUser");

    if (!session) throw status(401);

    const nickname = await auth.getUserNickname(session);
    if (!nickname) throw status(401)

    return { nickname }
  })
  .as("scoped")

export const defineOptionalSession = () => new Elysia({ name: "defineOptionalSession" })
  .derive(({ cookie }) => ({ session: cookie[SESSION_KEY].value as string | undefined }))
  .as("scoped")

export const defineUserRole = () => new Elysia({ name: "defineUserRole" })
  .use(defineRequiredUser())
  .derive(async ({ nickname, status }): Promise<{ role: { id: number; name: string }; nickname: string }> => {
    logValidators("defineUserRole");

    const role = await general
      .selectFrom("players")
      .innerJoin("roles", "roles.id", "players.role_id")
      .select(["roles.id", "roles.name"])
      .where("players.nickname", "=", nickname)
      .executeTakeFirst();

    if (!role) throw status(401)

    return { role, nickname }
  })
  .as("scoped")

export const defineRequiredSession = () => new Elysia({ name: "defineRequiredSession" })
  .use(defineRequiredUser())
  .derive(({ session, status }) => {
    if (!session) throw status(401);
    return { session };
  })
  .as("scoped")

export const defineBearer = () => new Elysia({ name: "defineBearer" })
  .use(bearer())
  .derive(async ({ bearer, status }) => {
    logValidators("defineBearer");

    if (!bearer) throw status(401);

    const result = await handleByBearer(bearer)
    if (!result) throw status(401);

    return { bearer };
  })
  .as("scoped")
