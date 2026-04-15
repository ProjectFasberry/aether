import { atom } from "@reatom/core";
import { PageContext } from "vike/types";
import { snapshotAtom } from "../lib/ssr";
import { localeDefault } from "../locales";
import { appOptionsAtom } from "./app.model";
import { urlAtom } from "@reatom/url";

export const pageContextAtom = atom<PageContext | null>(null, "pageContext");

export const isClientAtom = atom<boolean>((ctx) => {
	const pageContext = ctx.spy(pageContextAtom);
	return pageContext ? !!pageContext.Page : false;
}, "isClient");

export const isAuthedAtom = atom<boolean>((ctx) => ctx.spy(appOptionsAtom)?.isAuth ?? false, "isAuthed");

export const localeAtom = atom((ctx) => ctx.spy(appOptionsAtom).locale ?? localeDefault, "locale");
export const countryAtom = atom((ctx) => ctx.spy(appOptionsAtom).country, "country");

pageContextAtom.onChange((ctx, state) => {
	if (!state) return;

	const url = new URL(state.urlParsed.href, window.location.origin);
	urlAtom(ctx, url);
});

// sync snapshot
pageContextAtom.onChange((ctx, state) => {
	if (!state) return;
	snapshotAtom(ctx, state.snapshot);
});
