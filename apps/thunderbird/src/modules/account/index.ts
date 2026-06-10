import { defineRequiredUser } from "#/lib/define";
import { withData, withError } from "#/shared/schemas";
import Elysia, { t } from "elysia";
import { changePassword, changePasswordSchema, deleteAccount } from "./account.model";
import { ipPlugin } from "#/lib/plugins";
import { buildRouteSummary } from "#/utils";

export const account = new Elysia()
	.use(defineRequiredUser())
	.use(ipPlugin())
	.group("/account", (app) =>
		app
			.delete(
				"/",
				async ({ nickname, ip }) => {
					await deleteAccount({ nickname, ip });
					return { data: "OK" };
				},
				{
					response: {
						200: withData(t.Literal("OK")),
						500: withError(),
					},
					detail: {
						summary: buildRouteSummary("Delete account"),
					},
				},
			)
			.patch(
				"/password",
				async ({ nickname, ip, body: { currentPass, newPass } }) => {
					await changePassword({ nickname, ip, newPass, currentPass });
					return { data: "OK" };
				},
				{
					body: changePasswordSchema,
					response: {
						200: withData(t.Literal("OK")),
						500: withError(),
					},
					detail: {
						summary: buildRouteSummary("Change password"),
					},
				},
			),
	);
