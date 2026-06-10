import { buildRouteSummary } from "#/utils";
import Elysia, { t } from "elysia";

export const restore = new Elysia()
	.resolve(({ headers }) => ({ userAgent: headers["user-agent"] }))
	.group("/restore", (app) =>
		app
			.post(
				"/validate",
				async ({ status, body, userAgent }) => {
					return { data: null };
				},
				{
					parse: "json",
					body: t.Object({
						nickname: t.String(),
						hash: t.String(),
					}),
					detail: {
						summary: buildRouteSummary("Validate restore"),
					},
				},
			)
			.post(
				"/set-new-password",
				async (ctx) => {
					return { data: null };
				},
				{
					parse: "json",
					body: t.Object({
						newPassword: t.String({ minLength: 6, maxLength: 64 }),
					}),
					detail: {
						summary: buildRouteSummary("Set new password"),
					},
				},
			),
	);
