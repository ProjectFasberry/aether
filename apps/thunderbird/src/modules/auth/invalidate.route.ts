import Elysia, { t } from "elysia";
import { getClientDomain, SESSION_KEY } from "#/modules/auth/cookie";
import { defineRequiredSession } from "#/lib/define";
import { withData, withError } from "#/shared/schemas";
import { tokenService } from "#/modules/yggdrasil/token.model";
import { auth } from "./auth.model";
import { session } from "./login.model";
import { buildRouteSummary } from "#/lib/routes";
import { cookie } from "#/lib/cookies";

export const invalidate = new Elysia()
  .use(defineRequiredSession())
  .post("/invalidate-session", async ({ session: sessionToken, ...ctx }) => {
    const payload = await auth.getSessionPayload(sessionToken);

    await session.delete(sessionToken);

    // Logging out of the launcher also drops the game tokens minted from it.
    if (payload) {
      const account = await auth.getAccount(payload.nickname);

      if (account) await tokenService.revokeSession(account.id, sessionToken);
    }

    cookie.unset({ domain: getClientDomain(), key: SESSION_KEY, cookies: ctx.cookie })

    return { data: "OK" };
  }, {
    response: {
      200: withData(t.Literal("OK")),
      500: withError(),
      401: withError(),
    },
    detail: {
      summary: buildRouteSummary("Invalidate session"),
    },
  });
