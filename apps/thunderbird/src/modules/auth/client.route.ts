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

const loginSchema = t.Object({
  nickname: t.String(),
  password: t.String(),
});

const loginPayloadSchema = t.Object({
  nickname: t.String(),
  uuid: t.String(),
  token: t.String(),
  expires_at: DateTime,
});

const validatePayloadSchema = t.Object({
  nickname: t.String(),
  uuid: t.String(),
  expires_at: t.Nullable(DateTime),
});

const loginRoute = new Elysia()
  .use(ipPlugin())
  .post("/login", async ({ status, body: { nickname, password }, ip, headers }) => {
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

    return { data: { nickname: account.nickname, uuid: account.uuid, token, expires_at } };
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
  .use(defineOptionalBearerSession())
  .get("/validate", async ({ session, status }) => {
    if (!session) return status(401, wrapError("UNAUTHORIZED"));

    const nickname = await auth.getUserNickname(session);
    if (!nickname) return status(401, wrapError("UNAUTHORIZED"));

    const identity = await auth.getUserIdentity(nickname);
    if (!identity) return status(401, wrapError("UNAUTHORIZED"));

    const refreshed = await sessionService.refreshSession(session);

    return {
      data: {
        nickname: identity.nickname,
        uuid: identity.uuid,
        expires_at: refreshed?.expires_at ?? null,
      },
    };
  }, {
    detail: {
      summary: buildRouteSummary("Validate launcher session"),
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
