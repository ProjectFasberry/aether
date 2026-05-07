import Elysia from "elysia";
import { defineOptionalUser, defineOptionalSession, defineUserRole } from "./define";
import { general } from "#/shared/database/general-db";
import { auth } from "#/modules/auth/auth.model";
import { getPermissions } from "#/modules/user/me.model";
import { ipPlugin } from "./plugins/index";
import { client } from "#/shared/api/client";
import { HTTPError } from "ky";
import { CAP_URL, CAP_SECRET, CAP_SITE_KEY, isProduction } from "#/shared/env";
import { logErrorMsg } from "#/utils/config/log-utils";
import { safeJsonParse } from "#/utils/config/transforms";
import { libertybans } from "#/shared/database/libertybans-db";
import { getWhitelistIpList } from "#/shared/constants/urls";
import { validateLogger } from "#/utils/config/logger";

export const validatePermission = (permission: string) => new Elysia({ name: "validatePermission" })
  .use(defineUserRole())
  .derive(async ({ role, nickname, status }) => {
    if (!isProduction) {
      validateLogger.log("validatePermission")
    }
    const perms = await getPermissions(nickname, role.id)

    const isExist = perms.includes(permission)
    if (!isExist) throw status(400, "RESTRICT_BY_ROLE")

    return { role, permission }
  })
  .as("scoped")

export const validateAuthStatus = () => new Elysia({ name: "validateAuthStatus" })
  .use(defineOptionalSession())
  .onBeforeHandle(async ({ session, status }) => {
    if (!isProduction) {
      validateLogger.log("validateAuthStatus")
    }
    if (!session) return;

    const nickname = await auth.getUserNickname(session);
    if (nickname) throw status(409, "AUTHORIZED")
  })
  .as("scoped")

export const validateBannedStatus = () => new Elysia({ name: "validateBannedStatus" })
  .use(defineOptionalUser())
  .onBeforeHandle(async ({ nickname, status }) => {
    if (!isProduction) {
      validateLogger.log("validateBannedStatus");
    }
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
  ...opts, baseUrl: `${CAP_URL}/${CAP_SITE_KEY}`
}))

const ERRORS: Record<string, string> = {
  "Token not found": "TOKEN_NOT_FOUND"
}

async function verifyRequest(token: string): Promise<{ ok: boolean; error?: string }> {
  const json = { secret: CAP_SECRET, response: token }

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
    if (!isProduction) {
      validateLogger.log("botValidator");
    }

    const whitelist = getWhitelistIpList()
    if (whitelist.includes(ip)) return;

    const query = await general
      .selectFrom("options")
      .select("value")
      .where("name", "=", "botCheckEnabled")
      .executeTakeFirst()

    const isEnabled = Boolean(query?.value)
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