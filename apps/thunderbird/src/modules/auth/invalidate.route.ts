import Elysia, { t } from "elysia";
import { SESSION_KEY, unsetCookie } from "#/utils/auth/cookie";
import { defineRequiredSession } from "#/lib/define";
import { withData, withError } from "#/shared/schemas";
import { session } from "./login.model";
import { buildRouteSummary } from "#/utils";

export const invalidate = new Elysia().use(defineRequiredSession()).post(
	"/invalidate-session",
	async ({ cookie, session: sessionToken }) => {
		await session.delete(sessionToken);

		unsetCookie({ cookie, key: SESSION_KEY });

		return { data: "OK" };
	},
	{
		response: {
			200: withData(t.Literal("OK")),
			500: withError(),
			401: withError(),
		},
		detail: {
			summary: buildRouteSummary("Invalidate session"),
		},
	},
);
