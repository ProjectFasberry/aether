import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/framework";
import { isIdentityAtom, playerSsrModel, playerState } from "./player.model";
import { currentUserState } from "@/shared/models/current-user.model";
import { logError } from "@/shared/lib/log";
import { client } from "@/shared/lib/client-wrapper";
import { navigate } from "vike/client/router";
import { action, atom } from "@reatom/framework";
import { withAssign } from "@reatom/framework";
import { getDataFromSnapshot } from "@/shared/models/app/utils";
import { userState } from "@/shared/models/app/base.model";

type Player = ExtractApiData<"getServerPlayerByNickname">["data"]

type RateUserPayload = "rated" | "unrated";
type RateList = ExtractApiData<"getRateListByNickname">["data"]

export type RateUser = {
	initiator: string;
	created_at: string;
	avatar: string
};

export const PLAYERRATESTATE_DATA_KEY = "playerRateState.data";
export type PlayerRatePayload = Nullable<Player["rate"]>;

export const playerRateState = atom(null, "playerRateState").pipe(
	withAssign((_, name) => ({
		data: atom<PlayerRatePayload>(null, `${name}.data`).pipe(playerSsrModel.withSsr(PLAYERRATESTATE_DATA_KEY))
	}))
)

playerState.nickname.onChange((ctx, state) => {
	if (!state) return;

	const snapData = getDataFromSnapshot("playerRateState.data", ctx.get(playerSsrModel.snapshotAtom))
	playerRateState.data(ctx, snapData)
})

export const playerRate = atom(null, "playerRate").pipe(
	withAssign((_, name) => ({
		rate: reatomAsync(async (ctx, nickname: string) => {
			if (ctx.get(isIdentityAtom)) return;

			if (!ctx.get(userState.isAuthed)) {
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

			return await client
				.get<RateList>(`rate/list/${currentUser.nickname}`, {
					signal: ctx.controller.signal,
				})
				.exec()
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