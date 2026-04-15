import Elysia, { t } from "elysia";
import { HttpStatusEnum } from "elysia-http-status-code/status";
import { SESSION_KEY, unsetCookie } from "#/utils/auth/cookie";
import { defineUser } from "#/lib/middlewares/define";
import { withData, withError } from "#/shared/schemas";
import { wrapError } from "#/helpers/wrap-error";
import { deleteSession } from "./login.model";

export const invalidate = new Elysia()
	.use(defineUser())
	.model({
		invalidate: withData(t.Boolean()),
	})
	.derive(async ({ session, status }) => {
		if (!session) throw status(HttpStatusEnum.HTTP_401_UNAUTHORIZED);
		return { session };
	})
	.post(
		"/invalidate-session",
		async ({ cookie, session, status }) => {
			const result = await deleteSession(session);

			if (!result) {
				throw status(HttpStatusEnum.HTTP_500_INTERNAL_SERVER_ERROR, wrapError("Session is not deleted"));
			}

			unsetCookie({ cookie, key: SESSION_KEY });

			return { data: true };
		},
		{
			response: {
				200: "invalidate",
				500: withError,
			},
		},
	);
