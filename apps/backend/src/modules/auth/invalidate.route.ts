import Elysia, { t } from "elysia";
import { SESSION_KEY, unsetCookie } from "#/utils/auth/cookie";
import { defineUser } from "#/lib/middlewares/define";
import { withData, withError } from "#/shared/schemas";
import { wrapError } from "#/helpers/wrap-error";
import { session } from "./login.model";

export const invalidate = new Elysia()
	.use(defineUser())
	.model({
		invalidate: withData(t.Boolean()),
	})
	.derive(async ({ session, status }) => {
		if (!session) throw status(401);
		return { session };
	})
	.post("/invalidate-session", async ({ cookie, session: sessionToken, status }) => {
		const result = await session.delete(sessionToken);

		if (!result) {
			throw status(500, wrapError("Session is not deleted"));
		}

		unsetCookie({ cookie, key: SESSION_KEY });

		return { data: true };
	}, {
		response: {
			200: "invalidate",
			500: withError,
		},
	});