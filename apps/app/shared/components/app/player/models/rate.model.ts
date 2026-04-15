import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/async";
import { isIdentityAtom } from "./player.model";
import { currentUserAtom } from "@/shared/models/current-user.model";
import { logError } from "@/shared/lib/log";
import { client } from "@/shared/lib/client-wrapper";
import { isAuthedAtom } from "@/shared/models/page-context.model";
import { navigate } from "vike/client/router";
import { atom } from "@reatom/core";
import { Player } from "@repo/shared/types/entities/user";
import { withSsr } from "@/shared/lib/ssr";

type RateUserPayload = "rated" | "unrated";

export const playerRateAtom = atom<Player["rate"] | null>(null, "playerRate").pipe(withSsr("playerRate"));

export const rateUserAction = reatomAsync(
	async (ctx, nickname: string) => {
		if (ctx.get(isIdentityAtom)) return;

		if (!ctx.get(isAuthedAtom)) {
			return ctx.schedule(() => navigate("/auth"));
		}

		return await ctx.schedule(() => client.post<RateUserPayload>(`rate/${nickname}`).exec());
	},
	{
		name: "rateUserAction",
		onFulfill: (ctx, res) => {
			if (!res) return null;

			const isRated = res === "rated";

			playerRateAtom(ctx, (state) => {
				if (!state) return null;

				const current = state.count;
				const count = isRated ? current + 1 : current - 1;

				return { count, isRated };
			});
		},
		onReject: (ctx, e) => {
			logError(e);
		},
	},
).pipe(withStatusesAtom());

type RateList = {
	data: RateUser[];
	meta: number;
};

export type RateUser = {
	initiator: string;
	created_at: string;
};

export const rateListAction = reatomAsync(async (ctx) => {
	const isIdentity = ctx.get(isIdentityAtom);
	if (!isIdentity) return;

	const currentUser = ctx.get(currentUserAtom);
	if (!currentUser) return;

	return await ctx.schedule(() =>
		client<RateList>(`rate/list/${currentUser.nickname}`, {
			signal: ctx.controller.signal,
		}).exec(),
	);
}, "rateListAction").pipe(withDataAtom(null), withStatusesAtom(), withCache({ swr: false }));
