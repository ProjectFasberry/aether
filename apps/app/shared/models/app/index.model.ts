import { action, atom, withAssign, connectLogger, type Unsubscribe, withInit, type Ctx } from "@reatom/framework";
import type { PageContext } from "vike/types";
import { withLog } from "../../lib/reatom/helpers";
import { withSsr } from "../ssr";
import { detectHardwareAcceleration, detectMobile } from "../../lib/utils";
import { ENVIRONMENT } from "../../consts";
import { getIsAuthed, spyOptionAtom } from "./utils";
import { snapshots } from "../ssr";
import { pageState } from "../page-context.model";
import { logger } from "@/shared/lib/logger";
import { soundPatch } from "../sounds.model";

export const APP_OPTIONS_KEY = "appState.options" as const;
export const APP_DICTIONARIES_KEY = "appState.dict" as const;
export const MOBILE_BREAKPOINT = 1024 - 1

export type AppOptionsPayload = ExtractApiData<"getAppOptions">["data"]
export type AppSpecifiedOptions = { country: Nullable<string> }
export type AppOptionsPayloadExtend = AppOptionsPayload & { specified: AppSpecifiedOptions }
export type AppDictionaries = Record<string, string>

export const appState = atom(null, "appState").pipe(
	withAssign((_, name) => ({
		current: atom(null, `${name}.current`).pipe(
			withAssign((_, name) => ({
				isMobile: atom(false, `${name}.isMobile`).pipe(withSsr(`${name}.isMobile`)),
			}))
		),
		inited: atom(null, `${name}.inited`).pipe(
			withAssign((_, name) => ({
				isMobile: atom(false, `${name}.isMobile`),
				hardwaveIsEnabled: atom(false, "hardwareAccIsEnabled").pipe(
					withInit(() => detectHardwareAcceleration())
				)
			}))
		),
		options: atom<Nullable<AppOptionsPayloadExtend>>(null, `${name}.options`).pipe(withSsr(APP_OPTIONS_KEY)),
		dict: atom<Nullable<AppDictionaries>>(null, `${name}.dict`).pipe(withSsr(APP_DICTIONARIES_KEY))
	})),
);

export const userState = atom(null, "userState").pipe(
	withAssign((_, name) => ({
		geo: atom(null, `${name}.geo`).pipe(
			withAssign((_, name) => ({
				country: atom((ctx) => spyOptionAtom(ctx, "specified", "country", "ru"), `${name}.country`)
			}))
		),
		isAuthed: atom((ctx, snapshot?: Snapshot) => {
			if (ENVIRONMENT === 'server') {
				return getIsAuthed(snapshot)
			}
			return spyOptionAtom(ctx, "flags", "isAuthed", false)
		})
	}))
)

export const getDevModulesInfo = (ctx: Ctx) => {
	const stage = spyOptionAtom(ctx, "state", "stage", "prod")
	const allowedStage: typeof stage[] = ["staging"];
	const by = import.meta.env.DEV === true ? "environment" : "stage";

	const isMobile = ctx.get(appState.inited.isMobile)
	if (isMobile) return;

	return {
		isImport: import.meta.env.DEV || allowedStage.includes(stage),
		by
	}
}

export const app = atom(null, "app").pipe(
	withAssign((_, name) => ({
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

			const f = appState.inited.isMobile(ctx, detectMobile());

			const screen = updateReactiveIsMobile(ctx)
			screen.onChange();

			unsubs.push(screen.unsub)

			const devModulesInfo = getDevModulesInfo(ctx)

			if (devModulesInfo) {
				async function lazyInitDevModules(by: string) {
					try {
						const [{ devtools }] = await Promise.all([
							import("../devtools/index.model"),
						]);

						const modules = [
							{ name: 'Devtools', ref: devtools },
						];

						modules.forEach(mod => {
							try {
								mod.ref.init(ctx);
								logger.withTag(mod.name).log(`Load by ${by}`);
							} catch (e) {
								logger.withTag(mod.name).warn(`${mod.name} failed to init:`, e);
							}
						});
					} catch (e) {
						console.error("Error loading optional modules:", e);
					}
				}

				/** only fire and forget */
				lazyInitDevModules(devModulesInfo.by)
			}

			soundPatch.init(ctx)

			return () => {
				for (const unsub of unsubs) {
					unsub()
				}
			}
		}, `${name}.init`).pipe(
			withLog()
		),
		sync: action((ctx, pageCtx: PageContext) => {
			pageState.urlParsed(ctx, pageCtx.urlParsed);
			pageState.urlPathname(ctx, pageCtx.urlPathname);
			pageState.routeParams(ctx, pageCtx.routeParams);
			pageState.isClientside(ctx, !!pageCtx.Page)

			pageState.data(ctx, pageCtx.data ?? null);

			snapshots.init(ctx, pageCtx.snapshot);
		}, `${name}.sync`).pipe(
			withLog()
		),
	}))
)

const updateReactiveIsMobile = action((ctx) => {
	const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)

	const onChange = () => appState.current.isMobile(ctx, mql.matches)
	mql.addEventListener("change", onChange)

	const unsubs = {
		onChange,
		unsub: () => mql.removeEventListener("change", onChange)
	}

	return unsubs
})