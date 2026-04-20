import { logError } from "@/shared/lib/log";
import { reatomAsync, withCache, withDataAtom, withRetry, withStatusesAtom } from "@reatom/async";
import { PlayerActivityPayload } from "@repo/shared/types/entities/user";
import { client } from "@/shared/lib/client-wrapper";
import { playerParamAtom } from "./player.model";
import { atom, withAssign } from "@reatom/framework";

type PlayerLocation = {
  world: string,
  x: number,
  y: number,
  z: number,
  pitch: number,
  yaw: number,
  customLocation: string | null
}

export const playerActivity = atom(null, "playerActivity").pipe(
  withAssign((_, name) => ({
    online: atom(null, `${name}.online`).pipe(
      withAssign((_, name) => ({
        fetch: reatomAsync(async (ctx, nickname: string) => {
          return await ctx.schedule(() =>
            client
              .get<PlayerActivityPayload>(`server/activity/now/${nickname}`, {
                signal: ctx.controller.signal,
                retry: 1
              })
              .exec()
          )
        }, {
          name: `${name}.fetch`,
          onReject: (ctx, e) => {
            logError(e)
          }
        }).pipe(
          withDataAtom(null),
          withStatusesAtom(),
          withRetry()
        )
      }))
    ),
    location: atom(null, `${name}.location`).pipe(
      withAssign((_, name) => ({
        fetch: reatomAsync(async (ctx, nickname: string) => {
          return await ctx.schedule(() =>
            client<PlayerLocation>(`server/location/${nickname}`, { retry: 1 }).exec()
          )
        }, {
          name: `${name}.fetch`,
          onReject: (ctx, e) => {
            logError(e)
          }
        }).pipe(
          withDataAtom(null),
          withStatusesAtom(),
          withCache({ swr: false })
        )
      }))
    )
  }))
)

playerParamAtom.onChange((ctx, state) => state && playerActivity.online.fetch(ctx, state))