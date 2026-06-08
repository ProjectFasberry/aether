import Elysia from "elysia";
import { defineOptionalUser, defineOptionalSession, defineUserRole, defineBearer, handleByBearer } from "./define";
import { general } from "#/shared/database/general-db";
import { auth } from "#/modules/auth/auth.model";
import { getPermissions } from "#/modules/user/me.model";
import { ipPlugin } from "./plugins/index";
import { client } from "#/shared/api/client";
import { HTTPError } from "ky";
import { env } from "#/shared/env";
import { logErrorMsg, logValidators } from "#/utils/config/log-utils";
import { libertybans } from "#/shared/database/libertybans-db";
import { urlsService } from "#/shared/constants/urls";
import { safeJsonParse } from "#/utils";
import { getOption } from "#/shared/constants/options";

type ValidatePermission<T extends boolean> = T extends true
  ? { as: "external"; permission: string }
  : { as: "internal"; role: { id: number; name: string }; nickname: string; permission: string };

/**
 *
 * @param permission - The permission to validate
 * @param withExternal - Whether to use external bearer authentication
 */
export const validatePermission = <T extends boolean = false>(
  permission: string | null,
  { withExternal }: { withExternal: T } = { withExternal: false as T }
) => new Elysia()
  .use(withExternal ? defineBearer() : defineUserRole())
  .derive(async ({ status, ...args }): Promise<ValidatePermission<T>> => {
    logValidators("validatePermission")

    if (!permission) {
      console.warn(`Permission "${permission}" is not found. Route is disabled for security reasons`)
      throw status(500, "INTERNAL_SERVER_ERROR")
    }

    if ("role" in args && "nickname" in args) {
      const { role, nickname } = args

      const perms = await getPermissions(nickname, role.id)

      const isExist = perms.includes(permission)
      if (!isExist) {
        throw status(400, "PERMISSION_DENIED")
      }

      return { as: "internal", role, permission, nickname } as any
    }

    if ("bearer" in args) {
      const { bearer } = args

      if (bearer.trim().length === 0) {
        throw status(401, "BEARER_EMPTY")
      }

      const result = await handleByBearer(bearer)
      if (!result) {
        throw status(401, "UNAUTHORIZED");
      }

      return { as: "external", permission } as any
    }

    throw status(401, "UNAUTHORIZED")
  })
  .as("scoped")

export const validateAuthStatus = () => new Elysia({ name: "validateAuthStatus" })
  .use(defineOptionalSession())
  .onBeforeHandle(async ({ session, status }) => {
    logValidators("validateAuthStatus");

    if (!session) return;

    const nickname = await auth.getUserNickname(session);
    if (nickname) throw status(409, "AUTHORIZED")
  })
  .as("scoped")

export const validateBannedStatus = () => new Elysia({ name: "validateBannedStatus" })
  .use(defineOptionalUser())
  .onBeforeHandle(async ({ nickname, status }) => {
    logValidators("validateBannedStatus");

    if (!nickname) return;

    const target = await general
      .selectFrom("players")
      .select("role_id")
      .where("players.nickname", "=", nickname)
      .executeTakeFirst()

    if (target) {
      if (target?.role_id === 3) {
        return;
      }
    }

    const ban = await libertybans
      .selectFrom("libertybans_victims")
      .innerJoin("libertybans_names", "libertybans_names.uuid", "libertybans_victims.uuid")
      .innerJoin("libertybans_bans", "libertybans_bans.victim", "libertybans_victims.id")
      .select("libertybans_victims.id")
      .where("libertybans_names.lower_name", "=", nickname.toLowerCase())
      .executeTakeFirst()

    if (ban?.id) throw status(400, "RESTRICT_BY_BAN")
  })
  .as("scoped")

const capClient = client.extend((opts) => ({
  ...opts, baseUrl: `${env.CAP_URL}/${env.CAP_SITE_KEY}`
}))

const ERRORS: Record<string, string> = {
  "Token not found": "TOKEN_NOT_FOUND"
}

async function verifyRequest(token: string): Promise<{ ok: boolean; error?: string }> {
  const json = { secret: env.CAP_SECRET, response: token }

  try {
    const result = await capClient.post("siteverify", { json, retry: 1, timeout: 4000 })
    const { success } = await result.json<{ success: boolean }>()
    return { ok: success }
  } catch (e) {
    if (e instanceof HTTPError) {
      const text = await e.response.text()
      const parsed = safeJsonParse<{ error: string }>(text)

      if (parsed.ok) {
        const error = parsed.value.error
        return { ok: false, error: ERRORS[error] ?? error }
      }

      return { ok: false, error: text }
    }

    if (e instanceof Error) {
      return { ok: false, error: e.message }
    }

    return { ok: false, error: "UNKNOWN_ERROR" }
  }
}

export const botValidator = () => new Elysia({ name: "botValidator" })
  .use(ipPlugin())
  .resolve(({ query }) => ({ token: query.token }))
  .onBeforeHandle(async ({ status, token, ip }) => {
    logValidators("botValidator");

    const whitelist = urlsService.getWhitelistIpList()
    if (whitelist.includes(ip)) return;

    const isEnabled = await getOption("botCheckEnabled")
    if (!isEnabled) return;

    if (token.length <= 1) throw status(400)

    try {
      if (!token) throw status(400, "TOKEN_IS_NOT_PROVIDED")

      const result = await verifyRequest(token);
      if (!result.ok) throw status(400, result.error)

    } catch (e) {
      logErrorMsg(e);

      if (e instanceof Error) throw status(500, e.message)
    }
  })
  .as("scoped")
