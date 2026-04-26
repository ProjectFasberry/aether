import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/async";
import { isIdentityAtom } from "./player.model";
import { currentUserState } from "@/shared/models/current-user.model";
import { logError } from "@/shared/lib/log";
import { client } from "@/shared/lib/client-wrapper";
import { isAuthedAtom } from "@/shared/models/page-context.model";
import { navigate } from "vike/client/router";
import { action, atom } from "@reatom/core";
import { Player } from "@repo/shared/types/entities/user";
import { withAssign } from "@reatom/framework";
import { withSsr } from "@/shared/lib/reatom-helpers";

type RateUserPayload = "rated" | "unrated";
type RateList = ExtractApiData<"getRateListByNickname">["data"]

export type RateUser = {
	initiator: string;
	created_at: string;
	avatar: string
};

export const playerRateState = atom(null, "playerRateState").pipe(
	withAssign((_, name) => ({
		data: atom<Player["rate"] | null>(null, `${name}.data`).pipe(withSsr(`${name}.data`))
	}))
)

export const playerRate = atom(null, "playerRate").pipe(
	withAssign((_, name) => ({
		rate: reatomAsync(async (ctx, nickname: string) => {
			if (ctx.get(isIdentityAtom)) return;

			if (!ctx.get(isAuthedAtom)) {
				return ctx.schedule(() => navigate("/auth"));
			}

			return await client
				.post<RateUserPayload>(`rate/${nickname}`)
				.exec()
		}, {
			name: `${name}.rate`,
			onFulfill: (ctx, res) => {
				if (!res) return null;

				const isRated = res === "rated";

				playerRateState.data(ctx, (state) => {
					if (!state) return null;

					const current = state.count;
					const count = isRated ? current + 1 : current - 1;

					return { count, isRated };
				});
			},
			onReject: (ctx, e) => logError(e)
		}).pipe(
			withStatusesAtom()
		),
		fetchList: reatomAsync(async (ctx) => {
			const isIdentity = ctx.get(isIdentityAtom);
			if (!isIdentity) return null;

			const currentUser = ctx.get(currentUserState);
			if (!currentUser) return null;

			return await ctx.schedule(() =>
				client
					.get<RateList>(`rate/list/${currentUser.nickname}`, {
						signal: ctx.controller.signal,
					})
					.exec(),
			);
		}, `${name}.fetchList`).pipe(
			withDataAtom(null),
			withStatusesAtom(),
			withCache({ swr: false })
		),
		refetchAll: action((ctx) => {
			playerRate.fetchList.cacheAtom.reset(ctx)
			playerRate.fetchList(ctx)
		})
	}))
)