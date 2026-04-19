import Elysia, { type Context } from "elysia";
import { auth } from "#/modules/auth/auth.model";
import { general } from "#/shared/database/general-db";
import { isProduction } from "#/shared/env";
import { SESSION_KEY } from "#/utils/auth/cookie";
import { logger } from "#/utils/config/logger";

export const validateLogger = logger.withTag("Validation")

export async function handleAuthedByApiUser(headers: Context["headers"]): Promise<{ nickname: string } | null> {
  const apiKeyRaw = headers["authorization"];
  const apiKey = apiKeyRaw?.replace("Bearer", "").trim();

  if (!!apiKey && apiKey.trim().length !== 0) {
    const query = await general
      .selectFrom("api_keys")
      .select(["key", "nickname"])
      .where("key", "=", apiKey)
      .executeTakeFirst()

    if (query) {
      const { nickname } = query;
      return { nickname }
    }
  }

  return null;
}

export const defineOptionalUser = () => new Elysia()
  .use(defineSession())
  .derive(async ({ session, headers }) => {
    const result = await handleAuthedByApiUser(headers)
    if (result) return result

    if (!isProduction) {
      validateLogger.log("defineOptionalUser");
    }

    let nickname: string | null = null;

    if (session) {
      nickname = await auth.getUserNickname(session);
    }

    return { nickname }
  })
  .as("scoped")

export const defineUser = () => new Elysia()
  .use(defineSession())
  .derive(async ({ session, status, headers }) => {
    const result = await handleAuthedByApiUser(headers)
    if (result) return result

    if (!isProduction) {
      validateLogger.log("defineUser");
    }

    if (!session) {
      throw status(401)
    }

    const nickname: string | null = await auth.getUserNickname(session);

    if (!nickname) {
      throw status(401)
    }

    return { nickname }
  })
  .as("scoped")

export const defineSession = () => new Elysia()
  .derive(({ cookie }) => {
    const sessionCookie = cookie[SESSION_KEY];
    const session = sessionCookie.value as string | undefined;
    return { session }
  })
  .as("global")

export const defineUserRole = () => new Elysia()
  .use(defineUser())
  .derive(async ({ nickname, status, headers }) => {
    let role: { id: number, name: string } | null = null;

    const result = await handleAuthedByApiUser(headers)

    if (result) {
      // todo: impl correct way for define the highest role
      role = { id: 3, name: 'admin' }
      return { role }
    }

    if (!isProduction) {
      validateLogger.log("defineUserRole");
    }

    role = await general
      .selectFrom("players")
      .innerJoin("roles", "roles.id", "players.role_id")
      .select(["roles.id", "roles.name"])
      .where("players.nickname", "=", nickname)
      .executeTakeFirstOrThrow();

    if (!role) {
      throw status(500)
    }

    return { role }
  })
  .as("scoped")