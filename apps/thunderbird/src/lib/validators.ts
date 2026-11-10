import Elysia from "elysia";
import {
  defineOptionalUser,
  defineOptionalSession,
  defineUserRole,
  defineBearer,
  handleByBearer,
  getUserRole,
} from "./define";
import { general } from "#/shared/database/general-db";
import { auth } from "#/modules/auth/auth.model";
import { getPermissions } from "#/modules/user/me.model";
import { ipPlugin } from "./plugins/index";
import { client } from "#/shared/api/client";
import { getEnv } from "#/shared/env";
import { logErrorMsg, logValidators } from "#/shared/observability/log";
import { appLogger } from "#/shared/constants/logger";
import { libertybans } from "#/shared/database/libertybans-db";
import { urlsService } from "#/shared/services/urls";
import { safeJsonParse } from "#/utils";
import { getOption } from "#/shared/constants/options";
import bearer from "@elysia/bearer";

type ValidatePermission<T extends boolean> = T extends true
  ? { as: "external"; permission: string }
  : { as: "internal"; role: { id: number; name: string }; nickname: string; permission: string };

/**
 *
 * @param permission - The permission to validate
 * @param withExternal - Whether to use external bearer authentication. Defaults to `false`.
 */
export const validatePermission = <T extends boolean = false>(
  permission: string | null,
  { withExternal }: { withExternal: T } = { withExternal: false as T },
) => new Elysia()
  .use(defineOptionalUser())
  .use(withExternal && bearer())
  .derive(async ({ status, nickname, ...args }): Promise<ValidatePermission<T>> => {
    logValidators("validatePermission");

    if (!permission) {
      appLogger.warn(`Permission "${permission}" is not found. Route is disabled for security reasons`);
      throw status(500, "INTERNAL_SERVER_ERROR");
    }

    if (!nickname) {
      if (!withExternal) {
        throw status(401, "UNAUTHORIZED");
      }

      if ("bearer" in args) {
        const { bearer } = args;

        if (!bearer || bearer.trim().length === 0) {
          throw status(401, "BEARER_EMPTY");
        }

        const result = await handleByBearer(bearer);
        if (!result) {
          throw status(401, "UNAUTHORIZED");
        }

        return { as: "external", permission } as ValidatePermission<T>;
      }

      throw status(401, "UNAUTHORIZED");
    }

    const role = await getUserRole(nickname);

    if (role) {
      const perms = await getPermissions(nickname, role.id);

      const isExist = perms.includes(permission);
      if (!isExist) {
        throw status(400, "PERMISSION_DENIED");
      }

      return { as: "internal", role, permission, nickname } as ValidatePermission<T>;
    }

    throw status(401, "UNAUTHORIZED");
  })
  .as("scoped");

export const validateAuthStatus = () =>
  new Elysia({name: "validateAuthStatus"
})
    .use(defineOptionalSession())
    .onBeforeHandle(async ({ session, status }) => {
      logValidators("validateAuthStatus");

      if (!session) return;

      const nickname = await auth.getUserNickname(session);
      if (nickname) throw status(409, "AUTHORIZED");
    })
    .as("scoped");

export const validateBannedStatus = () =>
  new Elysia({ name: "validateBannedStatus" })
    .use(defineOptionalUser())
    .onBeforeHandle(async ({ nickname, status }) => {
      logValidators("validateBannedStatus");

      if (!nickname) return;

      const target = await general
        .selectFrom("players")
        .select("role_id")
        .where("players.nickname", "=", nickname)
        .executeTakeFirst();

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
        .executeTakeFirst();

      if (ban?.id) throw status(400, "RESTRICT_BY_BAN");
    })
    .as("scoped");

const capClient = client.extend((opts) => ({
  ...opts,
  baseUrl: `${getEnv().CAP_URL}/${getEnv().CAP_SITE_KEY}`,
}));

/**
 * The CAP token is single use: a stale token makes the CAP server answer 4xx.
 * `throwHttpErrors` stays off because on `HTTPError` ky has already consumed the
 * body, and reading `error.response.text()` throws "Body already used".
 */
async function verifyRequest(token: string): Promise<{ ok: boolean; error?: string }> {
  const json = { secret: getEnv().CAP_SECRET, response: token };

  try {
    const response = await capClient.post("siteverify", {
      json,
      retry: 1,
      timeout: 4000,
      throwHttpErrors: false,
    });
    const parsed = safeJsonParse<{ success?: boolean; error?: string }>(await response.text());
    const body = parsed.ok ? parsed.value : null;

    // The CAP server answers 4xx for expired, reused or malformed tokens; the
    // raw upstream text is not part of our API contract, so it stays a code.
    if (!response.ok) return { ok: false, error: "TOKEN_NOT_FOUND" };

    return { ok: Boolean(body?.success), error: body?.success ? undefined : "TOKEN_NOT_FOUND" };
  } catch {
    // Network error, timeout, DNS: the CAP server is unreachable, not the token.
    return { ok: false, error: "CAP_UNAVAILABLE" };
  }
}

export const botValidator = () =>
  new Elysia({ name: "botValidator" })
    .use(ipPlugin())
    // `x-cap-token` keeps the token out of access logs; `?token=` stays for
    // older clients until they migrate.
    .resolve(({ query, headers }) => ({ token: headers["x-cap-token"] ?? query.token }))
    .onBeforeHandle(async ({ status, token, ip }) => {
      logValidators("botValidator");

      const whitelist = urlsService.getWhitelistIpList();
      if (whitelist.includes(ip)) return;

      const isEnabled = await getOption("botCheckEnabled");
      if (!isEnabled) return;

      if (!token || token.length <= 1) throw status(400, "TOKEN_IS_NOT_PROVIDED");

      // Never throw `status()` from inside a try/catch: Elysia's status
      // response is an Error, so the catch would turn a clean 400 into a 500.
      const result = await verifyRequest(token);

      if (!result.ok) {
        logErrorMsg(result.error ?? "CAPTCHA_FAILED", { subject: "captcha" });
        throw status(400, result.error ?? "CAPTCHA_FAILED");
      }
    })
    .as("scoped");
