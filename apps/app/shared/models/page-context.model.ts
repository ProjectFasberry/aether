import { atom } from "@reatom/framework";
import { PageContextClient } from "vike/types";

export const pageCtxAtom = atom<Nullable<PageContextClient>>(null, "pageCtx");

export const isClientAtom = atom<boolean>((ctx) => {
	const pageCtx = ctx.spy(pageCtxAtom);
	return pageCtx ? !!pageCtx.Page : false;
});