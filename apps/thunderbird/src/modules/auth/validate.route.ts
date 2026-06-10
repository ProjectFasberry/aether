import Elysia, { t } from "elysia";
import { session } from "./login.model";
import { defineOptionalSession } from "#/lib/define";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";

export const validate = new Elysia()
	.use(defineOptionalSession())
	.derive(({ session }) => {
		if (!session) return { data: false };
		return { session };
	})
	.get(
		"/validate-session",
		async ({ session: sessionToken }) => {
			if (!sessionToken) return { data: false };

			const data = await session.getIsExistsSession(sessionToken);
			return { data };
		},
		{
			response: {
				200: withData(t.Boolean()),
			},
			detail: {
				summary: buildRouteSummary("Validate session"),
			},
		},
	);
