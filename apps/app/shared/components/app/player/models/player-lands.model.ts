import { reatomAsync, withStatusesAtom } from "@reatom/async"
import { logError } from "@/shared/lib/log"
import { atom } from "@reatom/core"
import { withAssign, withReset } from "@reatom/framework"
import { playerParamAtom } from "./player.model"
import { client } from "@/shared/lib/client-wrapper"
import { isEmptyArray } from "@/shared/lib/utils"
import { withSsr } from "@/shared/lib/reatom-helpers"

type PlayerLandsPayload = ExtractApiData<"getServerLandsListByNickname">["data"]

export async function getLands(nickname: string, init?: RequestInit) {
  return client<PlayerLandsPayload>(`server/lands/list/${nickname}`, init).exec()
}

export const playerLandsState = atom(null, "playerLandsState").pipe(
  withAssign((_, name) => ({
    data: atom<PlayerLandsPayload | null>(null, `${name}.data`).pipe(
      withSsr("playerLandsState.data"), withReset()
    )
  }))
)

export const playerLands = atom(null, "playerLands").pipe(
  withAssign((_, name) => ({
    fetch: reatomAsync(async (ctx, nickname: string) => {
      return await ctx.schedule(() =>
        getLands(nickname, { signal: ctx.controller.signal })
      )
    }, {
      name: `${name}.fetch`,
      onFulfill: (ctx, res) => {
        playerLandsState.data(ctx, isEmptyArray(res.data) ? null : res)
      },
      onReject: (_, e) => logError(e)
    }).pipe(
      withStatusesAtom()
    )
  }))
)

playerParamAtom.onChange((ctx, state) => state && playerLands.fetch(ctx, state))