import Elysia from "elysia";
import { bearer } from "@elysia/bearer";
import { general } from "../shared/database/general-db";
import { redis } from "../shared/redis/client";

export const SESSION_KEY = "session";
export const SESSION_PREFIX = "session:";

export const defineSession = () => new Elysia({ name: "defineSession" })
  .derive(({ cookie }) => ({ session: cookie[SESSION_KEY]?.value as string | null ?? null }))
  .as("global");

export async function handleUser(bearer: string): Promise<boolean> {
  const hash = new Bun.CryptoHasher("sha256")
    .update(bearer)
    .digest("hex");

  const query = await general
    .selectFrom("api_keys")
    .select("id")
    .where("key", "=", hash)
    .executeTakeFirst();

  return Boolean(query?.id);
}

export const defineBearer = () => new Elysia({ name: "defineBearer" })
  .use(bearer())
  .derive(async ({ bearer, status }) => {
    if (!bearer) throw status(401);

    const result = await handleUser(bearer);
    if (!result) throw status(401);

    return { bearer };
  })
  .as("scoped");

type StoredSession = { nickname?: string };

/**
 * The panel is cookie-authenticated, but the glaux service still guarded its
 * routes with a bearer API key; the editor therefore could not reach Traefik.
 *
 * Resolve the same `session:<token>` record the main API writes, then check
 * the effective role permissions (`role_permissions` UNION
 * `players_permissions`) for the requested permission.
 */
export const validateSessionPermission = (permission: string) =>
  new Elysia({ name: `validateSessionPermission:${permission}` })
    .use(defineSession())
    .derive(async ({ session, status }) => {
      if (!session) throw status(401, "UNAUTHORIZED");

      const raw = await redis.getInstance().get(`${SESSION_PREFIX}${session}`);
      if (!raw) throw status(401, "UNAUTHORIZED");

      let parsed: StoredSession;

      try {
        parsed = JSON.parse(raw) as StoredSession;
      } catch {
        throw status(401, "UNAUTHORIZED");
      }

      const nickname = parsed.nickname;
      if (!nickname) throw status(401, "UNAUTHORIZED");

      const player = await general
        .selectFrom("players")
        .select("role_id")
        .where("nickname", "=", nickname)
        .executeTakeFirst();

      if (!player) throw status(403, "PERMISSION_DENIED");

      const rows = await general
        .selectFrom("permissions as p")
        .select("p.name")
        .where(
          "p.id",
          "in",
          general
            .selectFrom("role_permissions as rp")
            .where("rp.role_id", "=", player.role_id)
            .select("rp.permission_id"),
        )
        .union(
          general
            .selectFrom("permissions as p")
            .innerJoin("players_permissions as pp", "pp.permission_id", "p.id")
            .where("pp.nickname", "=", nickname)
            .select("p.name"),
        )
        .execute();

      if (!rows.some((row) => row.name === permission)) {
        throw status(403, "PERMISSION_DENIED");
      }

      return { nickname };
    })
    .as("scoped");
