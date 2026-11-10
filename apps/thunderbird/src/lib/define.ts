import Elysia from "elysia";
import { auth } from "#/modules/auth/auth.model";
import { general } from "#/shared/database/general-db";
import { SESSION_KEY } from "#/modules/auth/cookie";
import { bearer } from "@elysia/bearer";
import { logValidators } from "#/shared/observability/log";
import { getRequestNickname, setRequestNickname } from "#/shared/services/session-cache";

/*
 * Positive results are cached so a burst of requests with the same key costs
 * one SELECT instead of one per request. Negative results are cached for a much
 * shorter time, so a freshly created key is picked up quickly.
 */
const BEARER_CACHE_TTL_MS = 30_000;
const BEARER_NEGATIVE_CACHE_TTL_MS = 5_000;
const BEARER_CACHE_MAX_ENTRIES = 1_000;

type BearerCacheEntry = { valid: boolean; expiresAt: number };

const bearerCache = new Map<string, BearerCacheEntry>();

function readBearerCache(token: string): boolean | null {
  const entry = bearerCache.get(token);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    bearerCache.delete(token);
    return null;
  }

  return entry.valid;
}

function writeBearerCache(token: string, valid: boolean, expiresAt: number): void {
  if (bearerCache.size >= BEARER_CACHE_MAX_ENTRIES) {
    const now = Date.now();

    for (const [key, entry] of bearerCache) {
      if (entry.expiresAt <= now) bearerCache.delete(key);
    }

    // Still full: drop the oldest insertion (Map keeps insertion order).
    if (bearerCache.size >= BEARER_CACHE_MAX_ENTRIES) {
      const oldest = bearerCache.keys().next();
      if (!oldest.done) bearerCache.delete(oldest.value);
    }
  }

  bearerCache.set(token, { valid, expiresAt });
}

export async function handleByBearer(bearer: string): Promise<boolean> {
  const cached = readBearerCache(bearer);
  if (cached !== null) return cached;

  const hash = new Bun.CryptoHasher("sha256")
    .update(bearer)
    .digest("hex");

  const query = await general
    .selectFrom("api_keys")
    .select(["id", "created_at", "duration"])
    .where("key", "=", hash)
    .executeTakeFirst();

  const now = Date.now();

  if (!query?.id) {
    writeBearerCache(bearer, false, now + BEARER_NEGATIVE_CACHE_TTL_MS);
    return false;
  }

  // A null duration is a legacy key without an expiry; new keys store seconds.
  const keyExpiresAt = query.duration == null
    ? Number.POSITIVE_INFINITY
    : new Date(query.created_at).getTime() + Number(query.duration) * 1000;

  const valid = keyExpiresAt > now;
  const expiresAt = valid
    ? Math.min(now + BEARER_CACHE_TTL_MS, keyExpiresAt)
    : now + BEARER_NEGATIVE_CACHE_TTL_MS;

  writeBearerCache(bearer, valid, expiresAt);

  return valid;
}

/**
 * Resolves a session token to a nickname once per request. The global session
 * derive already read the cookie session, so guards only hit Redis when the
 * token was not read yet (bearer tokens, tests without the global derive).
 */
export async function resolveNickname(request: Request, session: string | null): Promise<string | null> {
  if (!session) return null;

  const cached = getRequestNickname(request, session);
  if (cached !== undefined) return cached;

  const nickname = await auth.getUserNickname(session);
  if (nickname) setRequestNickname(request, session, nickname);

  return nickname;
}

export const defineOptionalUser = () => new Elysia({ name: "defineOptionalUser" })
  .use(defineOptionalSession())
  .derive(async ({ session, request }): Promise<{ nickname: string | null }> => {
    logValidators("defineOptionalUser");

    const nickname = await resolveNickname(request, session);
    return { nickname };
  })
  .as("scoped");

export const defineRequiredUser = () => new Elysia({ name: "defineRequiredUser" })
  .use(defineOptionalSession())
  .derive(async ({ session, request, status }): Promise<{ nickname: string }> => {
    logValidators("defineRequiredUser");

    if (!session) throw status(401);

    const nickname = await resolveNickname(request, session);
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
  .derive(async ({ session, request, status }): Promise<{ nickname: string; session: string }> => {
    logValidators("defineRequiredClientUser");

    if (!session) throw status(401);

    const nickname = await resolveNickname(request, session);
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
