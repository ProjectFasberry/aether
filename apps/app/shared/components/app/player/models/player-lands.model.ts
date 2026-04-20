import { reatomAsync, withStatusesAtom } from "@reatom/async"
import { PlayerLandsPayload } from "@repo/shared/types/entities/land"
import { logError } from "@/shared/lib/log"
import { withSsr } from "@/shared/lib/ssr"
import { atom } from "@reatom/core"
import { withAssign, withReset } from "@reatom/framework"
import { playerParamAtom } from "./player.model"
import { client } from "@/shared/lib/client-wrapper"
import { isEmptyArray } from "@/shared/lib/array"

export async function getLands(nickname: string, init?: RequestInit) {
  return client<PlayerLandsPayload>(`server/lands/list/${nickname}`, init).exec()
}

export const playerLandsState = atom(null, "playerLandsState").pipe(
  withAssign((_, name) => ({
    data: atom<PlayerLandsPayload | null>(null, `${name}.data`).pipe(
      withSsr("lands"), withReset()
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
      onReject: (ctx, e) => {
        logError(e)
      }
    }).pipe(
      withStatusesAtom()
    )
  }))
)

// on client
playerParamAtom.onChange((ctx, state) => state && playerLands.fetch(ctx, state))