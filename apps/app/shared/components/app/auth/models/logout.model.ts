import { alertDialog } from "@/shared/components/config/alert-dialog.model";
import { client } from "@/shared/lib/client-wrapper";
import { logError } from "@/shared/lib/log";
import { reatomAsync, withStatusesAtom } from "@reatom/async";
import { action } from "@reatom/core";

export const logout = action((ctx) => {
	ctx.schedule(() => window.location.reload());
}, `logout`);

export const beforeLogoutAction = action((ctx) => {
	alertDialog.open(ctx, {
		title: "Вы точно хотите выйти?",
		confirmAction: logoutAction,
		confirmLabel: "Выйти из аккаунта",
		autoClose: true,
	});
}, "beforeLogoutAction");

export const logoutAction = reatomAsync(
	async (ctx) => {
		return await ctx.schedule(() => client.post("auth/invalidate-session").exec());
	},
	{
		name: "logoutAction",
		onFulfill: (ctx) => logout(ctx),
		onReject: (ctx, e) => {
			logError(e);
		},
	},
).pipe(withStatusesAtom());
