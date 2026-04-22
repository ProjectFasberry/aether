import { atom } from "@reatom/core";
import { PageContext } from "vike/types";
import { localeDefault } from "../locales";
import { appState } from "./app.model";
import { urlAtom } from "@reatom/url";
import { snapshotAtom } from "../lib/reatom-helpers";

export const pageContextAtom = atom<PageContext | null>(null, "pageContext");

export const isClientAtom = atom<boolean>((ctx) => {
	const pageContext = ctx.spy(pageContextAtom);
	return pageContext ? !!pageContext.Page : false;
}, "isClient");

export const isAuthedAtom = atom<boolean>((ctx) => ctx.spy(appState.options)?.isAuth ?? false, "isAuthed");

export const localeAtom = atom((ctx) => ctx.spy(appState.options).locale ?? localeDefault, "locale");
export const countryAtom = atom((ctx) => ctx.spy(appState.options).country, "country");

pageContextAtom.onChange((ctx, state) => {
	if (!state) return;

	const url = new URL(state.urlParsed.href, window.location.origin);
	urlAtom(ctx, url);
});

// sync snapshot
pageContextAtom.onChange((ctx, state) => state && snapshotAtom(ctx, state.snapshot));