import { reatomAsync, withAbort, withAssign, withCache, withDataAtom, withErrorAtom, withStatusesAtom } from "@reatom/framework";
import { atom, batch, type Ctx } from "@reatom/framework";
import { withReset } from "@reatom/framework";
import { withHistory } from "@/shared/lib/reatom/helpers";
import { logError } from "@/shared/lib/log";
import {
	type RatingBelkoin,
	type RatingCharism,
	type RatingLands,
	type RatingParkour,
	type RatingPlaytime,
	type RatingReputation,
	type RatingsPayload,
} from "@/shared/schemas/rating";
import { client, withQueryParams } from "@/shared/lib/client-wrapper";
import { createViewerModel } from "@/shared/models/shared.model";

type RatingMap = {
	playtime: RatingPlaytime[];
	lands_chunks: RatingLands[];
	reputation: RatingReputation[];
	charism: RatingCharism[];
	belkoin: RatingBelkoin[];
	parkour: RatingParkour[];
};

//#region

export const { Component: RatingsViewer, inViewAtom: ratingIsViewAtom } = createViewerModel({
  name: "ratings-list",
})

export const ratingByAtom = atom<string>("playtime", "ratingBy").pipe(withHistory(1));
export const ratingServerAtom = atom<Maybe<string>>(undefined, "ratingServer");

export const ratingAscAtom = atom(false, "ratingAsc");
export const ratingEndCursorAtom = atom<Maybe<string>>(undefined, "ratingEndCursor").pipe(withReset());

function getParams(ctx: Ctx) {
	const opts = {
		asc: ctx.get(ratingAscAtom),
		cursor: ctx.get(ratingEndCursorAtom),
		server: ctx.get(ratingServerAtom),
	};

	const by = ctx.get(ratingByAtom) as keyof RatingMap;

	return { by, opts };
}

export async function getRatings(
	by: keyof RatingMap,
	{
		endCursor,
		asc,
		limit = 50,
		server,
	}: {
		endCursor?: string;
		asc: boolean;
		limit?: number;
		server?: string;
	},
	init: RequestInit,
) {
	const opts = { limit, endCursor, asc, server };

	return client
		.get<RatingsPayload>(`server/rating/${by}`, { ...init, retry: 1, throwHttpErrors: false })
		.pipe(withQueryParams(opts))
		.exec();
}

export const ratingDataAtom = atom<RatingsPayload["data"] | null>(null, "ratingData").pipe(withReset());
export const ratingMetaAtom = atom<RatingsPayload["meta"] | null>(null, "ratingMeta").pipe(withReset());

export const ratingsAction = reatomAsync(async (ctx) => {
	const { opts, by } = getParams(ctx);

	return await ctx.schedule(() => getRatings(by, opts, { signal: ctx.controller.signal }));
}, {
	name: "ratingsAction",
	onFulfill: (ctx, res) => {
		batch(ctx, () => {
			ratingDataAtom(ctx, res.data.length === 0 ? null : res.data);
			ratingMetaAtom(ctx, res.meta);
		});
	},
	onReject: (_, e) => logError(e)
}).pipe(withStatusesAtom(), withErrorAtom());
//#endregion

//#region
export const updateRatingAction = reatomAsync(async (ctx) => {
	const { by, opts } = getParams(ctx);

	return await ctx.schedule(() => getRatings(by, opts, { signal: ctx.controller.signal }));
}, {
	name: "updateRatingAction",
	onFulfill: (ctx, res) => {
		batch(ctx, () => {
			ratingDataAtom(ctx, res.data.length === 0 ? null : res.data);
			ratingMetaAtom(ctx, res.meta);
		});
	},
	onReject: (_, e) => {
		logError(e);
	},
}).pipe(withStatusesAtom());

ratingIsViewAtom.onChange((ctx, state) => {
	if (!state) return;

	const meta = ctx.get(ratingMetaAtom);
	const hasMore = meta?.hasNextPage;

	if (hasMore) {
		ratingEndCursorAtom(ctx, meta.endCursor);
		updateRatingAction(ctx);
	}
});
//#endregion

export type RatingItem = Pick<{ title: string; childs: string[] }, "title"> & {
	childs: { title: string, value: string }[],
	key: string
};

export const rating = atom(null, "rating").pipe(
	withAssign((_, name) => ({
		fetch: reatomAsync(async (ctx) => {
			return await ctx.schedule(() => client<RatingItem[]>("server/rating/list").exec())
		}, `${name}.fetch`).pipe(
			withDataAtom(),
			withCache({ swr: false }),
			withStatusesAtom(),
			withAbort()
		)
	}))
)
