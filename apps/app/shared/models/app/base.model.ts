import { action, atom, connectLogger, Ctx, CtxSpy, Unsubscribe } from "@reatom/framework";
import { client } from "../../lib/client-wrapper";
import { withAssign } from "@reatom/framework";
import { PageContext, PageContextServer } from "vike/types";
import { playerSeemsLikePlayersIsShowKey, playerSLPState } from "../../components/app/player/models/player-seems-like.model";
import { withLog } from "../../lib/reatom-helpers";
import { withSsr } from '../ssr';
import { isMobile, parseBoolean, parseCookie, unsubscribe } from "../../lib/utils";
import { ENVIRONMENT } from "../../consts";
import { getDataFromSnapshot } from "./utils";
import { APP_DICTIONARIES_KEY, APP_OPTIONS_KEY, MOBILE_BREAKPOINT } from "./const";
import { snapshots } from "../snapshot";
import { pageState } from "../page-context.model";
import { logger } from "@/shared/lib/logger";

export type AppOptionsPayload = ExtractApiData<"getAppOptions">["data"]
type AppSpecifiedOptions = { country: string | null }
export type AppOptionsPayloadExtend = AppOptionsPayload & { specified: AppSpecifiedOptions }
export type AppDictionaries = Record<string, string>

export async function getAppOptions(init: RequestInit) {
	return client<AppOptionsPayload>("app/options", init).exec();
}
export async function getAppDictionaries(init: RequestInit) {
	return client<AppDictionaries>("app/dictionaries", init).exec();
}

export const appState = atom(null, "appState").pipe(
	withAssign((_, name) => ({
		currentState: atom(null, `${name}.currentState`).pipe(
			withAssign((_, name) => ({
				isMobile: atom(false, `${name}.isMobile`).pipe(withSsr(`${name}.isMobile`)),
			}))
		),
		initState: atom(null, `${name}.initState`).pipe(
			withAssign((_, name) => ({
				isMobile: atom(false, `${name}.isMobile`)
			}))
		),
		options: atom<Nullable<AppOptionsPayloadExtend>>(null, `${name}.options`).pipe(withSsr(APP_OPTIONS_KEY)),
		dict: atom<Nullable<AppDictionaries>>(null, `${name}.dict`).pipe(withSsr(APP_DICTIONARIES_KEY))
	})),
);

export const userState = atom(null, "userState").pipe(
	withAssign((_, name) => ({
		geo: atom(null, `${name}.geo`).pipe(
			withAssign(() => ({
				country: atom((ctx) => spyOptionAtom(ctx, "specified", "country", "ru"), `${name}.country`)
			}))
		),
		isAuthed: atom((ctx, snapshot?: Snapshot) => {
			if (ENVIRONMENT === 'server') {
				return getDataFromSnapshot("appState.options", snapshot)?.flags.isAuthed ?? false
			}
			return spyOptionAtom(ctx, "flags", "isAuthed", false)
		}, `${name}.isAuthed`)
	}))
)

export const app = atom(null, "app").pipe(
	withAssign((_, name) => ({
		sync: action((ctx, pageCtx: PageContext) => {
			pageState.urlParsed(ctx, pageCtx.urlParsed)
			pageState.urlPathname(ctx, pageCtx.urlPathname)
			pageState.routeParams(ctx, pageCtx.routeParams);
			pageState.data(ctx, pageCtx.data ?? null);
			pageState.isClientside(ctx, !!pageCtx.Page)

			snapshots.init(ctx, pageCtx.snapshot);
		}, `${name}.sync`).pipe(
			withLog()
		),
		updateReactiveIsMobile: action((ctx) => {
			const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)

			const onChange = () => appState.currentState.isMobile(ctx, mql.matches)
			mql.addEventListener("change", onChange)

			const unsubs = {
				onChange,
				unsub: () => mql.removeEventListener("change", onChange)
			}

			return unsubs
		}),
		/** Executed on the server and client only one times */
		preInit: action((ctx, pageCtx: PageContext) => {
			if (import.meta.env.DEV && ENVIRONMENT === 'client') {
				connectLogger(ctx)
			}

			const rootSnapshot = pageCtx.snapshot;
			snapshots.init(ctx, rootSnapshot)
		}, `${name}.preInit`).pipe(
			withLog()
		),
		init: action((ctx) => {
			let unsubs: Unsubscribe[] = [];

			appState.initState.isMobile(ctx, isMobile());

			const screen = app.updateReactiveIsMobile(ctx)
			screen.onChange();

			unsubs.push(screen.unsub)

			const stage = spyOptionAtom(ctx, "state", "stage", "prod")
			const allowedStage: typeof stage[] = ["staging"];
			
			if (
				import.meta.env.DEV || allowedStage.includes(stage)
			) {
				logger.log(`Load devtools by ${import.meta.env.DEV ?? stage}`);
				
				async function lazyInitDevModules() {
					try {
						const [{ devtools }] = await Promise.all([
							import("../devtools/base.model"),
						]);

						const modules = [
							{ name: 'Devtools', ref: devtools },
						];

						modules.forEach(mod => {
							try {
								mod.ref.init(ctx);
							} catch (e) {
								console.warn(`${mod.name} failed to init:`, e);
							}
						});
					} catch (e) {
						console.error("Error loading optional modules:", e);
					}
				}

				/** only fire and forget */
				lazyInitDevModules()
			}

			return () => unsubscribe(unsubs)
		}, `${name}.init`).pipe(
			withLog()
		)
	}))
)

type Target<T = unknown> = Record<string, {
	atom: (ctx: Ctx, atom: any) => void, validator?: (value: string | T) => T;
}>

const COOKIE_TARGETS: Target = {
	[playerSeemsLikePlayersIsShowKey]: {
		atom: playerSLPState.settings.isShow, validator: (v) => typeof v === "string" ? parseBoolean(v) : v
	}
};

export const initCookie = action((ctx: Ctx, headers: NonNullable<PageContextServer["headers"]>) => {
	const cookies = parseCookie(headers["cookie"]);
	if (!Object.keys(cookies).length) return;

	for (const [key, value] of Object.entries(cookies)) {
		const target = COOKIE_TARGETS[key as keyof typeof COOKIE_TARGETS];
		if (!target) continue;

		const final = target.validator?.(value) ?? value;
		target.atom(ctx, final);
	}
})

export function spyOptionAtom<
	K extends keyof AppOptionsPayloadExtend,
	S extends keyof AppOptionsPayloadExtend[K]
>(
	ctx: CtxSpy | Ctx, key: K, subKey: S, defaultVal: AppOptionsPayloadExtend[K][S]
): AppOptionsPayloadExtend[K][S] {
	const map = ctx.spy ? ctx.spy(appState.options) : ctx.get(appState.options);
	return map?.[key]?.[subKey] ?? defaultVal;
}

export function getFromDictionary(ctx: Ctx, key: string): string {
	return ctx.get(appState.dict)?.[key] ?? key;
}