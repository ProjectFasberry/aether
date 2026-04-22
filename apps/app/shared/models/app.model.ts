import { action, atom, Ctx } from "@reatom/core";
import { AppOptionsPayload } from "@repo/shared/types/entities/other";
import { client } from "../lib/client-wrapper";
import { Locale } from "../locales";
import { reatomMap, withAssign } from "@reatom/framework";
import { PageContext, PageContextServer } from "vike/types";
import { pageContextAtom } from "./page-context.model";
import { devLog } from "../lib/log";
import { playerSeemsLikePlayersIsShowKey, playerSLPState } from "../components/app/player/models/player-seems-like.model";
import { withSsr } from "../lib/reatom-helpers";
import { isMobile, parseBoolean, parseCookie } from "../lib/utils";

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

export const APP_OPTIONS_KEY = "appState.options";
export const APP_DICTIONARIES_KEY = "appState.dict";

export async function getAppOptions(init: RequestInit) {
	return client<AppOptionsPayload>("app/options", init).exec();
}
export async function getAppDictionaries(init: RequestInit) {
	return client<Record<string, string>>("app/dictionaries", init).exec();
}

const MOBILE_BREAKPOINT = 1024

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
		options: atom<AppOptionsPayloadExtend>(appOptionsInit, `${name}.options`).pipe(withSsr(APP_OPTIONS_KEY)),
		dict: reatomMap<string, string>(new Map(), `${name}.dict`).pipe(withSsr(APP_DICTIONARIES_KEY))
	})),
);

type Target<T = any> = Record<string, {
	atom: (ctx: Ctx, atom: any) => void,
	validator?: (value: string | T) => T;
}>

const COOKIE_TARGETS: Target = {
	[playerSeemsLikePlayersIsShowKey]: {
		atom: playerSLPState.settings.isShow,
		validator: (v) => typeof v === "string" ? parseBoolean(v) : v
	}
};

export const app = atom(null, "app").pipe(
	withAssign((_, name) => ({
		init: action((ctx, pageCtx: PageContext) => {
			pageContextAtom(ctx, pageCtx);
			appState.initState.isMobile(ctx, isMobile());

			const screen = appState.updateReactiveIsMobile(ctx)
			screen.onChange();

			const unsubs = [
				screen.unsub
			]

			return () => unsubs.forEach(t => { t() })
		}, `${name}.init`),
		initCookie: action((ctx, pageCtx: PageContextServer) => {
			const headers = pageCtx.headers;
			if (!headers) return;

			const cookieStr = headers["cookie"];
			const cookies = parseCookie(cookieStr);
			if (!Object.keys(cookies).length) return;

			for (const [key, value] of Object.entries(cookies)) {
				const target = COOKIE_TARGETS[key as keyof typeof COOKIE_TARGETS];
				if (!target) continue;

				const finalValue = target.validator?.(value) ?? value;
				devLog(finalValue, "for", key);

				target.atom(ctx, finalValue);
			}
		})
	}))
)