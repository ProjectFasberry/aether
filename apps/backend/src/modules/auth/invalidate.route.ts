import Elysia, { t } from "elysia";
import { SESSION_KEY, unsetCookie } from "#/utils/auth/cookie";
import { defineUser } from "#/lib/middlewares/define";
import { withData, withError } from "#/shared/schemas";
import { session } from "./login.model";

export const invalidate = new Elysia()
	.use(defineUser())
	.derive(async ({ session, status }) => {
		if (!session) throw status(401);
		return { session };
	})
	.post("/invalidate-session", async ({ cookie, session: sessionToken }) => {
		await session.delete(sessionToken);

		unsetCookie({ cookie, key: SESSION_KEY });

		return { data: "OK" };
	}, {
		response: {
			200: withData(
				t.Literal("OK")
			),
			500: withError,
		},
	});