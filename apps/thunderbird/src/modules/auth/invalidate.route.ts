import Elysia, { t } from "elysia";
import { getClientDomain, SESSION_KEY } from "#/utils/auth/cookie";
import { defineRequiredSession } from "#/lib/define";
import { withData, withError } from "#/shared/schemas";
import { session } from "./login.model";
import { buildRouteSummary, cookie } from "#/utils";

export const invalidate = new Elysia()
  .use(defineRequiredSession())
  .post("/invalidate-session", async ({ session: sessionToken, ...ctx }) => {
    await session.delete(sessionToken);

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
