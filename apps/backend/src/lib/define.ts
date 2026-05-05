import Elysia from "elysia";
import { auth } from "#/modules/auth/auth.model";
import { general } from "#/shared/database/general-db";
import { SESSION_KEY } from "#/utils/auth/cookie";
import { toLog } from "./validators";
import { bearer } from "@elysia/bearer";

async function handleAuthedByApiUser(apiKey: string | undefined): Promise<{ nickname: string } | null> {
  if (!apiKey || apiKey.trim().length === 0) return null;

  const query = await general
    .selectFrom("api_keys")
    .select(["key", "nickname"])
    .where("key", "=", apiKey)
    .executeTakeFirst()

  if (!query) return null;

  return { nickname: query.nickname }
}

export const defineOptionalUser = () => new Elysia()
  .use(defineSession())
  .use(bearer())
  .use(toLog("defineOptionalUser"))
  .derive(async ({ session, bearer }) => {
    const result = await handleAuthedByApiUser(bearer)
    if (result) return result

    let nickname: string | null = null;

    if (session) {
      nickname = await auth.getUserNickname(session);
    }

    return { nickname }
  })
  .as("scoped")

export const defineUser = () => new Elysia()
  .use(defineSession())
  .use(bearer())
  .use(toLog("defineUser"))
  .derive(async ({ session, status, bearer }) => {
    if (!session) throw status(401)

    const result = await handleAuthedByApiUser(bearer)
    if (result) return result

    const nickname: string | null = await auth.getUserNickname(session);
    if (!nickname) throw status(401)

    return { nickname }
  })
  .as("scoped")

export const defineSession = () => new Elysia()
  .use(toLog("defineSession"))
  .derive(({ cookie }) => ({ session: cookie[SESSION_KEY].value as string | undefined }))
  .as("global")

export const defineUserRole = () => new Elysia()
  .use(defineUser())
  .use(toLog("defineUserRole"))
  .use(bearer())
  .derive(async ({ nickname, status, bearer }) => {
    let role: { id: number, name: string } | null = null;

    const result = await handleAuthedByApiUser(bearer)

    if (result) {
      // todo: impl correct way for define the highest role
      role = { id: 3, name: 'admin' }
      return { role }
    }

    role = await general
      .selectFrom("players")
      .innerJoin("roles", "roles.id", "players.role_id")
      .select(["roles.id", "roles.name"])
      .where("players.nickname", "=", nickname)
      .executeTakeFirstOrThrow();

    if (!role) throw status(500)

    return { role }
  })
  .as("scoped")