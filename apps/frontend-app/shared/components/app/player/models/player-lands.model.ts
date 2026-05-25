import { reatomAsync, withStatusesAtom } from "@reatom/framework"
import { logError } from "@/shared/lib/log"
import { atom } from "@reatom/framework"
import { withAssign, withReset } from "@reatom/framework"
import { playerState } from "./player.model"
import { client } from "@/shared/lib/client-wrapper"
import { isEmptyArray } from "@/shared/lib/helpers"
import { withSsr } from "@/shared/models/ssr"

type PlayerLandsPayload = ExtractApiData<"getServerLandsListByNickname">["data"]

export async function getLands(nickname: string, init?: RequestInit) {
  return client<PlayerLandsPayload>(`server/lands/list/${nickname}`, init).exec()
}

export const playerLandsState = atom(null, "playerLandsState").pipe(
  withAssign((_, name) => ({
    data: atom<Nullable<PlayerLandsPayload>>(null, `${name}.data`).pipe(withSsr(`${name}.data`), withReset())
  }))
)

export const playerLands = atom(null, "playerLands").pipe(
  withAssign((_, name) => ({
    fetch: reatomAsync(async (ctx) => {
      const nickname = ctx.get(playerState.nickname)
      if (!nickname) return null;

      playerLandsState.data.reset(ctx);
      return await ctx.schedule(() => getLands(nickname, { signal: ctx.controller.signal }))
    }, {
      name: `${name}.fetch`,
      onFulfill: (ctx, res) => res && playerLandsState.data(ctx, isEmptyArray(res.data) ? null : res),
      onReject: (_, e) => logError(e)
    }).pipe(
      withStatusesAtom()
    )
  }))
)

playerState.nickname.onChange((ctx, state) => state && playerLands.fetch(ctx))