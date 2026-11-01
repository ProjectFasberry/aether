import Elysia, { t } from "elysia";
import bcrypt from "bcryptjs";
import { wrapError } from "@repo/shared/lib/helpers";
import { auth } from "./auth.model";
import { session as sessionService } from "./login.model";
import { defineOptionalBearerSession } from "#/lib/define";
import { ipPlugin } from "#/lib/plugins";
import { buildRouteSummary } from "#/utils";
import { withData, withError } from "#/shared/schemas";
import { DateTime } from "#/helpers/typebox";
import { skinsService } from "#/shared/services/skins";
import { changePassword } from "#/modules/account/account.model";

/**
 * Head images live in a private bucket; hand the launcher an API link that it
 * can actually render (`volume.fasberry.fun/avatars/...` answers 403).
 */
const publicAvatar = (request: Request, url: string): string => {
  const marker = "/avatars/";
  const index = url.indexOf(marker);

  if (index === -1) return url;

  const file = url.slice(index + marker.length);
  const origin = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? origin.protocol.replace(":", "");

  return `${proto}://${origin.host}/avatars/${file}`;
};

const loginSchema = t.Object({
  nickname: t.String(),
  password: t.String(),
});

const loginPayloadSchema = t.Object({
  nickname: t.String(),
  uuid: t.String(),
  avatar: t.String(),
  token: t.String(),
  expires_at: DateTime,
});

const validatePayloadSchema = t.Object({
  nickname: t.String(),
  uuid: t.String(),
  avatar: t.String(),
  expires_at: t.Nullable(DateTime),
});

const changePasswordSchema = t.Object({
  currentPass: t.String({ minLength: 1, maxLength: 72 }),
  newPass: t.String({ minLength: 6, maxLength: 72 }),
});

const loginRoute = new Elysia()
  .use(ipPlugin())
  .post("/login", async ({ status, body: { nickname, password }, ip, headers, request }) => {
    const account = await auth.getAccount(nickname);

    if (!account) return status(400, wrapError("NOT_EXISTS"));

    if (!bcrypt.compareSync(password, account.hash)) {
      return status(400, wrapError("PASSWORD_OR_LOGIN_INCORRECT"));
    }

    // One launcher session per account. Browser sessions stay untouched.
    await sessionService.deleteByClient(account.nickname, "launcher");

    const { token, expires_at } = await sessionService.create({
      nickname: account.nickname,
      ip,
      client: "launcher",
      userAgentStr: headers["user-agent"],
    });

    const avatar = publicAvatar(request, await skinsService.player.getAvatar(account.nickname));

    return {
      data: {
        nickname: account.nickname,
        uuid: account.uuid,
        avatar,
        token,
        expires_at,
      },
    };
  }, {
    body: loginSchema,
    response: {
      200: withData(loginPayloadSchema),
      400: withError(t.UnionEnum(["NOT_EXISTS", "PASSWORD_OR_LOGIN_INCORRECT"])),
    },
    detail: {
      summary: buildRouteSummary("Launcher login"),
    },
  });

const sessionRoute = new Elysia()
  .use(ipPlugin())
  .use(defineOptionalBearerSession())
  .get("/validate", async ({ session, status, request }) => {
    if (!session) return status(401, wrapError("UNAUTHORIZED"));

    const nickname = await auth.getUserNickname(session);
    if (!nickname) return status(401, wrapError("UNAUTHORIZED"));

    const identity = await auth.getUserIdentity(nickname);
    if (!identity) return status(401, wrapError("UNAUTHORIZED"));

    const refreshed = await sessionService.refreshSession(session);
    const avatar = publicAvatar(request, await skinsService.player.getAvatar(identity.nickname));

    return {
      data: {
        nickname: identity.nickname,
        uuid: identity.uuid,
        avatar,
        expires_at: refreshed?.expires_at ?? null,
      },
    };
  }, {
    detail: {
      summary: buildRouteSummary("Validate launcher session"),
    },
  })
  .patch("/password", async ({ session, body, status, ip }) => {
    if (!session) return status(401, wrapError("UNAUTHORIZED"));

    const nickname = await auth.getUserNickname(session);
    if (!nickname) return status(401, wrapError("UNAUTHORIZED"));

    const result = await changePassword({
      nickname,
      ip,
      currentPass: body.currentPass,
      newPass: body.newPass,
    });

    if (!result.ok) {
      return status(result.error === "NOT_FOUND" ? 404 : 400, wrapError(result.error));
    }

    return { data: "OK" };
  }, {
    body: changePasswordSchema,
    response: {
      200: withData(t.Literal("OK")),
      400: withError(t.UnionEnum(["PASSWORD_OR_LOGIN_INCORRECT", "PASSWORD_IS_UNSAFE"])),
      401: withError(t.String()),
      404: withError(t.UnionEnum(["NOT_FOUND"])),
    },
    detail: {
      summary: buildRouteSummary("Change the launcher account password"),
    },
  })
  .post("/logout", async ({ session, status }) => {
    if (!session) return status(401, wrapError("UNAUTHORIZED"));

    await sessionService.delete(session);

    return { data: true };
  }, {
    detail: {
      summary: buildRouteSummary("Launcher logout"),
    },
  });

/**
 * Launcher-facing auth endpoints.
 *
 * Browsers get the session as a cookie from `/auth/login/basic`; the launcher
 * has no cookie jar, so it receives the raw token in JSON and sends it back as
 * `Authorization: Bearer <token>`.
 */
export const clientAuth = new Elysia()
  .group("/client", app => app
    .use(loginRoute)
    .use(sessionRoute),
  );
