import { action, atom } from "@reatom/core";
import { AppOptionsPayload } from "@repo/shared/types/entities/other";
import { withSsr } from "../lib/ssr";
import { client } from "../lib/client-wrapper";
import { Locale } from "../locales";
import { reatomMap, withAssign } from "@reatom/framework";
import { isMobile } from "../lib/detects";
import { PageContext } from "vike/types";
import { pageContextAtom } from "./page-context.model";

export type AppOptionsPayloadExtend = AppOptionsPayload & {
	locale: Locale;
	country: string | null;
};

export const appOptionsInit: AppOptionsPayloadExtend = {
	bannerIsExists: false,
	isBanned: false,
	isAuth: false,
	locale: "ru",
	country: null,
	isWl: false,
};

export const APP_OPTIONS_KEY = "appOptions";
export const appOptionsAtom = atom<AppOptionsPayloadExtend>(appOptionsInit, "appOptions").pipe(
	withSsr(APP_OPTIONS_KEY),
);
export async function getAppOptions(init: RequestInit) {
	return client<AppOptionsPayload>("app/options", init).exec();
}

export const APP_DICTIONARIES_KEY = "appDictionaries";
export const appDictionariesAtom = reatomMap<string, string>().pipe(withSsr(APP_DICTIONARIES_KEY));
export async function getAppDictionaries(init: RequestInit) {
	return client<Record<string, string>>("app/dictionaries", init).exec();
}

const MOBILE_BREAKPOINT = 768

export const appState = atom(null, "appState").pipe(
	withAssign((_, name) => ({
		updateReactiveIsMobile: action((ctx) => {
			const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

			const onChange = () => {
				appState.isMobile(ctx, mql.matches)
			}

			mql.addEventListener("change", onChange)

			return {
				unsub: () => {
					mql.removeEventListener("change", onChange)
				},
				onChange
			}
		}),
		isMobile: atom(false, `${name}.isMobile`),
		initState: atom(null, `${name}.initState`).pipe(
			withAssign((_, name) => ({
				isMobile: atom(false, `${name}.isMobile`)
			}))
		),
	})),
);

export const initApp = action((ctx, pageCtx: PageContext) => {
	pageContextAtom(ctx, pageCtx);
	appState.initState.isMobile(ctx, isMobile());

	const screen = appState.updateReactiveIsMobile(ctx)
	screen.onChange();
	
	const unsubs = [
		screen.unsub
	]

	return () => unsubs.forEach(t => { t() })
}, "initApp");