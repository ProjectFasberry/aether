import { alertDialog } from "@/shared/components/config/alert-dialog/alert-dialog.model";
import { client } from "@/shared/lib/client-wrapper";
import { logError } from "@/shared/lib/log";
import { reatomAsync, withErrorAtom, withStatusesAtom } from "@reatom/framework";
import { action, atom } from "@reatom/framework";
import { withAssign } from "@reatom/framework";

export const logout = atom(null, "logout").pipe(
	withAssign((_, name) => ({
		exec: reatomAsync(() => client.post("auth/invalidate-session").exec(), {
			name: `${name}.exec`,
			onFulfill: (ctx) => ctx.schedule(() => window.location.reload()),
			onReject: (_, e) => logError(e),
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
			});
		}, `${name}.withConfirm`),
	}))
)
