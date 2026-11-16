import { validatePermission } from "#/lib/validators";
import { defineRequiredUser } from "#/lib/define";
import { ipPlugin } from "#/lib/plugins/index";
import { register } from "#/modules/auth/register.model";
import { deleteAccount } from "#/modules/account/account.model";
import { auth } from "#/modules/auth/auth.model";
import { createInviteLink } from "#/modules/auth/player-links.model";
import { createError, withShared } from "#/helpers/error";
import { wrapError } from "@repo/shared/lib/helpers";
import { natsService } from "#/shared/nats/client";
import { registerSchema } from "@repo/shared/schemas/auth";
import Elysia, { t } from "elysia";
import * as z from "zod";
import { SUBJECTS } from "#/shared/nats/subjects";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { DateTime } from "#/helpers/typebox";

const PLAYERS_AUTH_ERRORS = {
  USER_EXISTS: { msg: "Player already exists", code: 400 },
  NOT_FOUND: { msg: "Player not found", code: 404 },
} as const;

/** Shared registry for the admin auth routes; routes read it with `reader`. */
export const playersAuthError = createError(withShared(PLAYERS_AUTH_ERRORS), "INTERNAL_UNKNOWN");

function publishAuth(event: keyof typeof SUBJECTS.EVENTS.AUTHORIZATION, { nickname, created_at }: { nickname: string, created_at?: Date }) {
  const nc = natsService.getInstance()
  nc.publish(SUBJECTS.EVENTS.AUTHORIZATION[event], JSON.stringify({ nickname, created_at }))
}
const getWrappedData = <T>(value?: unknown): T | null => {
  if (!value || typeof value !== "object") return null;

  return (value as { data?: T }).data ?? null;
};

const playersAuthReg = new Elysia()
  .use(ipPlugin())
  .post("/register", async ({ ip, body: { nickname, password } }) => {
    const data = await register.create({
      nickname, ip, password
    });

    return { data }
  }, {
    body: registerSchema.pick({
      nickname: true, password: true
    }),
    // `register.create` already publishes AUTHORIZATION.REGISTER; a second
    // publish here duplicated every registration event.
    response: {
      200: withData(
        t.Object({
          nickname: t.String(),
          created_at: DateTime
        })
      )
    },
    detail: {
      summary: buildRouteSummary("Register player")
    }
  })

const playersAuthUnreg = new Elysia()
  .use(ipPlugin())
  .post("/unregister", async ({ body: { nickname }, ip, status }) => {
    try {
      // Same path as self-service deletion: every plugin database, sessions and
      // tokens are cleaned up, not only the `general` account row.
      const result = await deleteAccount({ nickname, ip });

      if (!result.ok) throw playersAuthError.raise("NOT_FOUND");

      return { data: { nickname } }
    } catch (error) {
      const err = playersAuthError.reader(error);
      return status(err.code as 404 | 500, wrapError(err.msg));
    }
  }, {
    body: z.intersection(
      registerSchema.pick({ nickname: true }),
      z.object({
        strict: z.stringbool().or(z.boolean()).default(false)
      })
    ),
    afterResponse: ({ responseValue }) => {
      const res = getWrappedData<{ nickname: string }>(responseValue)
      if (!res) return;
      publishAuth("UNREGISTER", res);
    },
    response: {
      200: withData(
        t.Object({
          nickname: t.String()
        })
      ),
      404: withError(t.String()),
      500: withError(t.String()),
    },
    detail: {
      summary: buildRouteSummary("Unregister player")
    }
  })

const playersAuthInvite = new Elysia()
  .use(defineRequiredUser())
  .post("/invite", async ({ body: { nickname }, nickname: initiator, status }) => {
    try {
      const exists = await auth.getExistsUser(nickname);
      if (exists.result) throw playersAuthError.raise("USER_EXISTS");

      // The account is reserved now; the player only sets the password later.
      await register.createPending({ nickname });

      const link = await createInviteLink({ nickname, createdBy: initiator });

      return { data: { token: link.token, expires_at: link.expiresAt } };
    } catch (error) {
      const err = playersAuthError.reader(error);
      return status(err.code as 400 | 500, wrapError(err.msg));
    }
  }, {
    body: registerSchema.pick({ nickname: true }),
    response: {
      200: withData(
        t.Object({
          token: t.String(),
          expires_at: DateTime,
        }),
      ),
      400: withError(t.String()),
      500: withError(t.String()),
    },
    detail: {
      summary: buildRouteSummary("Invite player"),
    },
  })

export const playersAuth = new Elysia()
  .use(validatePermission("players.auth", { withExternal: true }))
  .group("/auth", app => app
    .use(playersAuthReg)
    .use(playersAuthUnreg)
    .use(playersAuthInvite)
  )
