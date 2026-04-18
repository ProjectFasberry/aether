import { isEmptyArray } from "@/shared/lib/array";
import { client } from "@/shared/lib/client-wrapper";
import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/async";
import { action, atom } from "@reatom/core";
import { withAssign } from "@reatom/framework";
import { login } from "../../auth/models/login.model";

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
		cleanup: atom<{ cb: (() => void) | null }>({ cb: null }, `${name}.cleanup`),
		confirmDialogIsOpen: atom(false, `${name}.confirmDialogIsOpen`)
	}))
)

const listenBackOnce = (cb: () => void) => {
	window.history.pushState({ active: true }, '');

	const handler = () => {
		cb();
		window.removeEventListener('popstate', handler);
	};

	window.addEventListener('popstate', handler);

	return () => {
		window.removeEventListener('popstate', handler);
		if (window.history.state?.active) {
			window.history.back();
		}
	};
};

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
			scanState.cleanup(ctx, { cb: null });
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