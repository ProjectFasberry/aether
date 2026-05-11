import { currentUserState } from "@/shared/models/current-user/index.model"
import { action, atom, reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/framework"
import { withAssign, withReset } from "@reatom/framework"
import { client } from "@/shared/lib/client-wrapper"
import { createSsrModel } from "@/shared/models/ssr"
import { getDataFromSnapshot } from "@/shared/models/app/utils"
import { userState } from "@/shared/models/app/index.model"
import { navigate } from "vike/client/router"
import { logError } from "@/shared/lib/log"

export const PLAYER_RATE_DATA_KEY = "playerRateState.data";
export const PLAYER_TAGS_DATA_KEY = "playerState.tags"

export type Player = ExtractApiData<"getServerPlayerByNickname">["data"]
export type PlayerTagsPayload = Player["group"][];
export type PlayerRatePayload = Player["rate"]

export const playerSsrModel = createSsrModel({ name: "player", subscribe: false })

export const playerState = atom(null, "playerState").pipe(
  withAssign((_, name) => ({
    data: atom<Nullable<Omit<Player, "rate">>>(null, `${name}.data`).pipe(playerSsrModel.withSsr(`${name}.data`), withReset()),
    nickname: atom<Nullable<string>>(null, `${name}.nickname`).pipe(playerSsrModel.withSsr(`${name}.nickname`), withReset()),
    tags: atom<PlayerTagsPayload>([], `${name}.tags`).pipe(playerSsrModel.withSsr(PLAYER_TAGS_DATA_KEY), withReset()),
    rate: atom<Nullable<PlayerRatePayload>>(null, `${name}.rate`).pipe(playerSsrModel.withSsr(PLAYER_RATE_DATA_KEY))
  }))
)

type RateListPayload = ExtractApiData<"getRateListByNickname">["data"]

export type RateUser = {
  initiator: string;
  created_at: string;
  avatar: string
};

export const player = atom(null, "player").pipe(
  withAssign((_, name) => ({
    rate: atom(null, `${name}.rate`).pipe(
      withAssign((_, name) => ({
        rate: reatomAsync(async (ctx, nickname: string) => {
          if (ctx.get(isIdentityAtom)) return;
    
          if (!ctx.get(userState.isAuthed)) {
            return ctx.schedule(() => navigate("/auth"));
          }
    
          return await client
            .post<"rated" | "unrated">(`rate/${nickname}`)
            .exec()
        }, {
          name: `${name}.rate`,
          onFulfill: (ctx, res) => {
            if (!res) return null;
    
            const isRated = res === "rated";
    
            playerState.rate(ctx, (state) => {
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
            .get<RateListPayload>(`rate/list/${currentUser.nickname}`, {
              signal: ctx.controller.signal,
            })
            .exec()
        }, `${name}.fetchList`).pipe(
          withDataAtom(null),
          withStatusesAtom(),
          withCache({ swr: false })
        ),
        refetchAll: action((ctx) => {
          player.rate.fetchList.cacheAtom.reset(ctx)
          player.rate.fetchList(ctx)
        })
      }))
    )
  }))
)


playerState.nickname.onChange((ctx) => {
  playerState.tags(ctx,
    getDataFromSnapshot("playerState.tags", ctx.get(playerSsrModel.snapshotAtom)) ?? []
  )

  playerState.rate(ctx,
    getDataFromSnapshot("playerRateState.data", ctx.get(playerSsrModel.snapshotAtom))
  )
})

export const isIdentityAtom = atom<boolean>((ctx) => {
  const currentUser = ctx.spy(currentUserState)
  if (!currentUser) return false;

  const targetNickname = ctx.spy(playerState.nickname)
  if (!targetNickname) return false;

  return targetNickname === currentUser.nickname;
})

export async function getPlayer(nickname: string, init: RequestInit) {
  return client<Player>(`server/player/${nickname}`, init).exec()
}