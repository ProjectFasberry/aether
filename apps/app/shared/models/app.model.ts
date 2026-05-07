import { action, atom, Ctx } from "@reatom/framework";
import { client } from "../lib/client-wrapper";
import { Locale, localeDefault } from "../locales";
import { withAssign } from "@reatom/framework";
import { PageContextServer } from "vike/types";
import { playerSeemsLikePlayersIsShowKey, playerSLPState } from "../components/app/player/models/player-seems-like.model";
import { withSsr } from "../lib/reatom-helpers";
import { isMobile, parseBoolean, parseCookie } from "../lib/utils";
import { usePageContext } from "vike-react/usePageContext";
import { MePayload } from "./current-user.model";
import { debug } from "./debug.model";

export type AppOptionsPayload = ExtractApiData<"getAppOptions">["data"]
export type AppOptionsPayloadExtend = AppOptionsPayload & {
	locale: Locale;
	country: string | null;
};

export type AppDictionaries = Record<string, string>

export const appOptionsInit: AppOptionsPayloadExtend = {
	bannerIsExists: false,
	isBanned: false,
	isAuth: false,
	locale: "ru",
	country: null,
	isWl: false,
	pofEnabled: true,
};

export const APP_OPTIONS_KEY = "appState.options" as const;
export const APP_DICTIONARIES_KEY = "appState.dict" as const;

export async function getAppOptions(init: RequestInit) {
	return client<AppOptionsPayload>("app/options", init).exec();
}
export async function getAppDictionaries(init: RequestInit) {
	return client<AppDictionaries>("app/dictionaries", init).exec();
}

type KeysData = {
	APP_OPTIONS_KEY: AppOptionsPayloadExtend,
	APP_DICTIONARIES_KEY: AppDictionaries,
	CURRENT_USER_KEY: MePayload
}
export function getDataFromSnapshot<T extends keyof KeysData>(key: T): KeysData[T] {
	return usePageContext().snapshot[key]?.data
}

const MOBILE_BREAKPOINT = 1024

export const appState = atom(null, "appState").pipe(
	withAssign((_, name) => ({
		updateReactiveIsMobile: action((ctx) => {
			const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

			const onChange = () => appState.isMobile(ctx, mql.matches)
			mql.addEventListener("change", onChange)

			return {
				unsub: () => {
					mql.removeEventListener("change", onChange)
				},
				onChange
			}
		}),
		isMobile: atom(false, `${name}.isMobile`).pipe(withSsr(`${name}.isMobile`)),
		initState: atom(null, `${name}.initState`).pipe(
			withAssign((_, name) => ({
				isMobile: atom(false, `${name}.isMobile`)
			}))
		),
		options: atom<AppOptionsPayloadExtend>(appOptionsInit, `${name}.options`).pipe(withSsr(APP_OPTIONS_KEY)),
		dict: atom<AppDictionaries>({}, `${name}.dict`).pipe(withSsr(APP_DICTIONARIES_KEY))
	})),
);

export const userState = atom(null, "userState").pipe(
	withAssign((_, name) => ({
		geo: atom(null, `${name}.geo`).pipe(
			withAssign(() => ({
				country: atom((ctx) => ctx.spy(appState.options).country, `${name}.country`)
			}))
		),
		locale: atom((ctx) => ctx.spy(appState.options).locale ?? localeDefault, "locale"),
		isAuthed: atom<boolean>((ctx) => ctx.spy(appState.options)?.isAuth ?? false, "isAuthed")
	}))
)

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
		init: action((ctx) => {
			appState.initState.isMobile(ctx, isMobile());

			const screen = appState.updateReactiveIsMobile(ctx)
			screen.onChange();

			const unsubs = [
				screen.unsub
			]

			debug.init(ctx);

			return () => unsubs.forEach(t => { t() })
		}, `${name}.init`),
		initCookie: (ctx: Ctx, headers: NonNullable<PageContextServer["headers"]>) => {
			const cookieStr = headers["cookie"];
			const cookies = parseCookie(cookieStr);
			if (!Object.keys(cookies).length) return;

			for (const [key, value] of Object.entries(cookies)) {
				const target = COOKIE_TARGETS[key as keyof typeof COOKIE_TARGETS];
				if (!target) continue;

				const final = target.validator?.(value) ?? value;
				target.atom(ctx, final);
			}
		}
	}))
)

export function getFromDictionary(ctx: Ctx, key: string) {
	return ctx.get(appState.dict)[key] ?? key
}