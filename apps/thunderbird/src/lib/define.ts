import Elysia from "elysia";
import { auth } from "#/modules/auth/auth.model";
import { general } from "#/shared/database/general-db";
import { SESSION_KEY } from "#/modules/auth/cookie";
import { bearer } from "@elysia/bearer";
import { logValidators } from "#/shared/observability/log";

export async function handleByBearer(bearer: string): Promise<boolean> {
  const hash = new Bun.CryptoHasher("sha256")
    .update(bearer)
    .digest("hex");

  const query = await general
    .selectFrom("api_keys")
    .select(["id", "created_at", "duration"])
    .where("key", "=", hash)
    .executeTakeFirst();

  if (!query?.id) return false;

  // A null duration is a legacy key without an expiry; new keys store seconds.
  if (query.duration == null) return true;

  return new Date(query.created_at).getTime() + Number(query.duration) * 1000 > Date.now();
}

export const defineOptionalUser = () => new Elysia({ name: "defineOptionalUser" })
  .use(defineOptionalSession())
  .derive(async ({ session }): Promise<{ nickname: string | null }> => {
    logValidators("defineOptionalUser");

    const nickname = session ? await auth.getUserNickname(session) : null;
    return { nickname };
  })
  .as("scoped");

export const defineRequiredUser = () => new Elysia({ name: "defineRequiredUser" })
  .use(defineOptionalSession())
  .derive(async ({ session, status }): Promise<{ nickname: string }> => {
    logValidators("defineRequiredUser");

    if (!session) throw status(401);

    const nickname = await auth.getUserNickname(session);
    if (!nickname) throw status(401);

    return { nickname };
  })
  .as("scoped");

export const defineOptionalSession = () => new Elysia({ name: "defineOptionalSession" })
  .derive(({ cookie }) => ({ session: cookie[SESSION_KEY].value as string | null ?? null }))
  .as("scoped");

/**
 * Same as `defineOptionalSession`, but also accepts the token as
 * `Authorization: Bearer <token>`. Used by the launcher, which has no cookie jar.
 */
export const defineOptionalBearerSession = () => new Elysia({ name: "defineOptionalBearerSession" })
  .derive(({ cookie, headers }) => {
    const raw = headers.authorization ?? "";
    const [scheme, value] = raw.split(" ");
    const bearerToken = scheme?.toLowerCase() === "bearer" && value ? value : null;
    const cookieToken = (cookie[SESSION_KEY].value as string | null) ?? null;

    return { session: bearerToken ?? cookieToken };
  })
  .as("scoped");

export const defineRequiredClientUser = () => new Elysia({ name: "defineRequiredClientUser" })
  .use(defineOptionalBearerSession())
  .derive(async ({ session, status }): Promise<{ nickname: string; session: string }> => {
    logValidators("defineRequiredClientUser");

    if (!session) throw status(401);

    const nickname = await auth.getUserNickname(session);
    if (!nickname) throw status(401);

    return { nickname, session };
  })
  .as("scoped");

export async function getUserRole(nickname: string) {
  const role = await general
    .selectFrom("players")
    .innerJoin("roles", "roles.id", "players.role_id")
    .select(["roles.id", "roles.name"])
    .where("players.nickname", "=", nickname)
    .executeTakeFirst();

  return role ?? null;
}

export const defineUserRole = () => new Elysia({ name: "defineUserRole" })
  .use(defineRequiredUser())
  .derive(async ({ nickname, status }): Promise<{ role: { id: number; name: string }; nickname: string }> => {
    logValidators("defineUserRole");

    const role = await getUserRole(nickname);
    if (!role) throw status(401);

    return { role, nickname };
  })
  .as("scoped");

export const defineRequiredSession = () => new Elysia({ name: "defineRequiredSession" })
  .use(defineRequiredUser())
  .derive(({ session, status }) => {
    if (!session) throw status(401);
    return { session };
  })
  .as("scoped");

export const defineBearer = () => new Elysia({ name: "defineBearer" })
  .use(bearer())
  .derive(async ({ bearer, status }) => {
    logValidators("defineBearer");

    if (!bearer) throw status(401);

    const result = await handleByBearer(bearer);
    if (!result) throw status(401);

    return { bearer };
  })
  .as("scoped");
