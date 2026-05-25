import { currentUserState } from "@/shared/models/current-user/index.model"
import { action, atom, reatomAsync, withAbort, withCache, withDataAtom, withStatusesAtom } from "@reatom/framework"
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
        submit: reatomAsync(async (ctx, nickname: string) => {
          if (ctx.get(isIdentityAtom)) return;
    
          if (!ctx.get(userState.isAuthed)) {
            return ctx.schedule(() => navigate("/auth"));
          }
    
          return await client
            .post<"rated" | "unrated">(`rate/${nickname}`)
            .exec()
        }, {
          name: `${name}.submit`,
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
          onReject: (_, e) => logError(e)
        }).pipe(
          withStatusesAtom()
        ),
        fetchList: reatomAsync(async (ctx, nickname: string) => {          
          const isAuthed = ctx.get(userState.isAuthed)
          if (!isAuthed) return null;
    
          return await client
            .get<RateListPayload>(`rate/list/${nickname}`, {
              signal: ctx.controller.signal,
            })
            .exec()
        }, {
          name: `${name}.fetchList`
        }).pipe(
          withDataAtom(null),
          withStatusesAtom(),
          withCache({ swr: false }),
          withAbort()
        ),
        refetchAll: action((ctx, nickname: string) => {
          player.rate.fetchList.cacheAtom.reset(ctx)
          player.rate.fetchList(ctx, nickname)
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