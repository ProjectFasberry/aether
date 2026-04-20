import { alertDialog } from "@/shared/components/config/alert-dialog.model";
import { client } from "@/shared/lib/client-wrapper";
import { logError } from "@/shared/lib/log";
import { reatomAsync, withErrorAtom, withStatusesAtom } from "@reatom/async";
import { action, atom } from "@reatom/core";
import { withAssign } from "@reatom/framework";

export const logout = atom(null, "logout").pipe(
	withAssign((_, name) => ({
		exec: reatomAsync(async (ctx) => {
			return await ctx.schedule(() =>
				client.post("auth/invalidate-session").exec()
			);
		}, {
			name: `${name}.withoutConfirm`,
			onFulfill: (ctx) => ctx.schedule(() => window.location.reload()),
			onReject: (ctx, e) => {
				logError(e);
			},
		}).pipe(
			withStatusesAtom(),
			withErrorAtom()
		),
		withConfirm: action((ctx) => {
			alertDialog.open(ctx, {
				title: "Вы точно хотите выйти?",
				confirmAction: logout.exec,
				confirmLabel: "Выйти из аккаунта",
				autoClose: true,
				withDelay: false
			});
		}, `${name}.withConfirm`),
	}))
)