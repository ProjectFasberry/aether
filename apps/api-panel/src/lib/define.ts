import Elysia from "elysia";
import { general } from "../shared/database";
import { redis } from "../shared/redis/client";
import { logger } from "../shared/logger";
import { safeJsonParse } from "@repo/shared/lib/utils";
import { bearer } from "@elysia/bearer";

const logDefine = (name: string) => Bun.env.PROD && logger.log(name)

type UserSessionPayload = {
  nickname: string;
  browser: string;
  ip: string;
  os: string;
  platform: string;
  created_at: string | Date;
};

export const getUserKey = (token: string) => `session:${token}`;
export const SESSION_KEY = "session";

async function getPermissions(nickname: string, role_id: number): Promise<string[]> {
  const effectivePermissions = await general
    .selectFrom("permissions as p")
    .select(["p.name"])
    .where(
      "p.id",
      "in",
      general
        .selectFrom("role_permissions as rp")
        .where("rp.role_id", "=", role_id)
        .select("rp.permission_id"),
    )
    .union(
      general
        .selectFrom("permissions as p")
        .innerJoin("players_permissions as pp", "pp.permission_id", "p.id")
        .where("pp.nickname", "=", nickname)
        .select(["p.name"]),
    )
    .execute();

  return effectivePermissions.map((p) => p.name);
}

export async function getUserNickname(token: string): Promise<string | null> {
  const client = redis.getInstance();

  const data = await client.get(getUserKey(token));
  if (!data) return null;

  const result = safeJsonParse<UserSessionPayload>(data);
  if (!result.ok) return null;

  return result.value.nickname ?? null;
}

export const defineSession = () => new Elysia({ name: "defineSession" })
  .derive(({ cookie }) => ({ session: cookie[SESSION_KEY]?.value as string | undefined }))
  .as("global");

export const validatePermission = (permission: string) => new Elysia({ name: "validatePermission" })
  .use(defineUserRole())
  .derive(async ({ role, nickname, status }) => {
    logDefine("validatePermission");

    const perms = await getPermissions(nickname, role.id);

    const targetIsExist = perms.includes(permission);
    if (!targetIsExist) throw status(400, "RESTRICTED_BY_ROLE");

    return { role, permission };
  })
  .as("scoped");

export const defineUser = () => new Elysia({ name: "defineUser" })
  .use(defineSession())
  .use(bearer())
  .derive(async ({ session, status, bearer }) => {
    logDefine("defineUser");

    if (bearer) {
      const result = await handleUser(bearer);
      if (!result?.nickname) throw status(401);

      return { nickname: result.nickname };
    } else {
      if (!session) throw status(401);

      const nickname = await getUserNickname(session);
      if (!nickname) throw status(401);

      return { nickname };
    }
  })
  .as("scoped");

export const defineUserRole = () => new Elysia({ name: "defineUserRole" })
  .use(defineUser())
  .derive(async ({ nickname, status, bearer }) => {
    logDefine("defineUserRole");

    if (bearer) {
      const result = await handleUser(bearer);
      if (!result) throw status(401);

      return {
        role: {
          id: 3,
          name: "admin"
        }
      };
    } else {
      const role = await general
        .selectFrom("players")
        .innerJoin("roles", "roles.id", "players.role_id")
        .select(["roles.id", "roles.name"])
        .where("players.nickname", "=", nickname)
        .executeTakeFirstOrThrow();

      return { role };
    }
  })
  .as("scoped");

export async function handleUser(bearer: string): Promise<{ nickname: string } | null> {
  const hash = new Bun.CryptoHasher("sha256").update(bearer).digest("hex");

  const query = await general
    .selectFrom("api_keys")
    .select("nickname")
    .where("key", "=", hash)
    .executeTakeFirst()

  if (!query) return null;

  return { nickname: query.nickname }
}

export const defineBearer = () => new Elysia({ name: "defineBearer" })
  .use(bearer())
  .derive(async ({ bearer, status }) => {
    if (!bearer) throw status(401);

    const result = await handleUser(bearer)
    if (!result?.nickname) throw status(401);

    return { bearer, nickname: result.nickname };
  })
  .as("scoped")
