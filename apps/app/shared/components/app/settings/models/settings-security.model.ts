import { isEmptyArray } from "@/shared/lib/array";
import { client } from "@/shared/lib/client-wrapper";
import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/async";
import { atom } from "@reatom/core";

export type SessionPayload = {
	id: string;
	browser: string;
	geo: { city: string; country: string };
	createdAt: string;
};

export const accountCurrentSessionAction = reatomAsync(async (ctx) => {
	return await ctx.schedule(() => client<SessionPayload>("auth/session/current").exec());
}, "accountCurrentSessionAction").pipe(withDataAtom(), withStatusesAtom(), withCache({ swr: false }));

export const accountActiveSessionsMetaAtom = atom<PaginatedMeta | null>(null, "accountActiveSessionsMeta");

export const accountActiveSessionsAction = reatomAsync(async (ctx) => {
	return await ctx.schedule(() => client<{ data: SessionPayload[]; meta: PaginatedMeta }>("auth/session/list").exec());
}, "accountActiveSessionsAction").pipe(
	withDataAtom(null, (ctx, data) => {
		if (isEmptyArray(data.data)) return null;
		accountActiveSessionsMetaAtom(ctx, data.meta);
		return data.data;
	}),
	withStatusesAtom(),
	withCache({ swr: false }),
);
