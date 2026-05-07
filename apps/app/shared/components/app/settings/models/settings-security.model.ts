import { isEmptyArray } from "@/shared/lib/utils";
import { client } from "@/shared/lib/client-wrapper";
import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/framework";
import { action, atom } from "@reatom/framework";
import { withAssign, withReset } from "@reatom/framework";
import { login } from "../../auth/models/login.model";
import { listenBackOnce } from "@/shared/lib/events";

export type SessionPayload = {
	id: string;
	browser: string;
	geo: { city: string; country: string };
	createdAt: string;
};

export const accountCurrentSessionAction = reatomAsync(async (ctx) => {
	return await ctx.schedule(() =>
		client<SessionPayload>("auth/session/current").exec()
	);
}, "accountCurrentSessionAction").pipe(
	withDataAtom(),
	withStatusesAtom(),
	withCache({ swr: false })
);

export const accountActiveSessionsMetaAtom = atom<PaginatedMeta | null>(null, "accountActiveSessionsMeta");

export const accountActiveSessionsAction = reatomAsync(async (ctx) => {
	return await ctx.schedule(() =>
		client<{ data: SessionPayload[]; meta: PaginatedMeta }>("auth/session/list").exec()
	);
}, "accountActiveSessionsAction").pipe(
	withDataAtom(null, (ctx, data) => {
		if (isEmptyArray(data.data)) return null;
		accountActiveSessionsMetaAtom(ctx, data.meta);
		return data.data;
	}),
	withStatusesAtom(),
	withCache({ swr: false }),
);

export const scanState = atom(null, "scanState").pipe(
	withAssign((_, name) => ({
		isStarted: atom(false, `${name}.isStarted`),
		cleanup: atom<{ cb: (() => void) | null }>({ cb: null }, `${name}.cleanup`).pipe(withReset()),
		confirmDialogIsOpen: atom(false, `${name}.confirmDialogIsOpen`)
	}))
)

export const scan = atom(null, "scan").pipe(
	withAssign((_, name) => ({
		start: action((ctx) => {
			scanState.isStarted(ctx, true)

			const existsCleanup = ctx.get(scanState.cleanup).cb
			existsCleanup?.()

			const cleanup = listenBackOnce(() => scan.stop(ctx));
			scanState.cleanup(ctx, { cb: cleanup });
		}, `${name}.start`),
		stop: action((ctx) => {
			scanState.isStarted(ctx, false)

			const cleanup = ctx.get(scanState.cleanup).cb;
			if (!cleanup) return;

			cleanup();
			scanState.cleanup.reset(ctx)
		}, `${name}.stop`),
		verify: action((ctx, value: string) => {
			scan.stop(ctx);

			scanState.confirmDialogIsOpen(ctx, true)

			const url = new URL(value)

			const token = url.searchParams.get("token");
			if (!token) throw new Error('Token is not defined')

			login.qr.verify.validateToken(ctx, token)
		}, `${name}.verify`),
	}))
)

export const fetchSessions = action((ctx) => {
	accountActiveSessionsAction(ctx)
	accountCurrentSessionAction(ctx)
})