import Elysia from "elysia";
import { auth } from "#/modules/auth/auth.model";
import { general } from "#/shared/database/general-db";
import { SESSION_KEY } from "#/utils/auth/cookie";
import { bearer } from "@elysia/bearer";
import { validateLogger } from "#/shared/constants/logger";
import { LOGGING } from "#/shared/constants";

async function handleByBearer(bearer: string): Promise<{ nickname: string } | null> {
  const hash = new Bun.CryptoHasher("sha256").update(bearer).digest("hex");

  const query = await general
    .selectFrom("api_keys")
    .select("nickname")
    .where("key", "=", hash)
    .executeTakeFirst()

  if (!query) return null;

  return { nickname: query.nickname }
}

export const defineOptionalUser = () => new Elysia({ name: "defineOptionalUser" })
  .use(defineOptionalSession())
  .use(bearer())
  .derive(async ({ session, bearer }) => {
    if (LOGGING.validators) {
      validateLogger.log("defineOptionalUser");
    }

    if (bearer && bearer.trim().length !== 0) {
      const result = await handleByBearer(bearer)

      if (result) {
        return result
      }
    }

    let nickname: string | null = null;

    if (session) {
      nickname = await auth.getUserNickname(session);
    }

    return { nickname }
  })
  .as("scoped")

export const defineRequiredUser = () => new Elysia({ name: "defineRequiredUser" })
  .use(defineOptionalSession())
  .use(bearer())
  .derive(async ({ session, status, bearer }) => {
    if (LOGGING.validators) {
      validateLogger.log("defineRequiredUser");
    }

    if (bearer && bearer.trim().length >= 1) {
      const result = await handleByBearer(bearer)

      if (result) {
        return { nickname: result.nickname }
      }
    }

    if (!session) throw status(401)
    const nickname = await auth.getUserNickname(session);
    if (!nickname) throw status(401)

    return { nickname }
  })
  .as("scoped")

export const defineOptionalSession = () => new Elysia({ name: "defineOptionalSession" })
  .derive(({ cookie }) => ({ session: cookie[SESSION_KEY].value as string | undefined }))
  .as("scoped")

export const defineUserRole = () => new Elysia({ name: "defineUserRole" })
  .use(defineOptionalUser())
  .use(bearer())
  .derive(async ({ nickname, status, bearer }) => {
    if (LOGGING.validators) {
      validateLogger.log("defineUserRole");
    }

    if (bearer && bearer.trim().length >= 1) {
      const result = await handleByBearer(bearer)

      if (result?.nickname) {
        // todo: impl correct way for define the highest role
        return {
          role: {
            id: 3,
            name: 'admin'
          },
          nickname: result.nickname
        }
      }
    }

    if (!nickname) throw status(401)

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
  .derive(async ({ session, status }) => {
    if (!session) throw status(401);
    return { session };
  })
  .as("scoped")

export const defineBearer = () => new Elysia({ name: "defineBearer" })
  .use(bearer())
  .derive(async ({ bearer, status }) => {
    if (!bearer) throw status(401);

    if (LOGGING.validators) {
      validateLogger.log("defineBearer");
    }

    const b = await handleByBearer(bearer)
    if (!b) throw status(401);

    return { bearer };
  })
  .as("scoped")
