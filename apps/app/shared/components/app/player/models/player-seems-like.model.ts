import { reatomAsync, withDataAtom, withStatusesAtom } from "@reatom/async";
import { playerParamAtom } from "./player.model";
import { action, atom, take, withAssign } from "@reatom/framework";
import { toast } from "sonner";
import dayjs from "@/shared/lib/create-dayjs";
import { client } from "@/shared/lib/client-wrapper";
import { withSsr } from "@/shared/lib/reatom-helpers";
import { setCookie } from "@/shared/lib/utils";

export const playerSeemsLikePlayersIsShowKey = "playerSLPState.isShow"
type SeemsLikePlayersPayload = ExtractApiData<"getServerSeems-likeByNickname">["data"]

export const playerSLPState = atom(null, "playerSLPState").pipe(
  withAssign((_, name) => ({
    settings: atom(null, `${name}.settings`).pipe(
      withAssign(() => ({
        isShow: atom(true, `${name}.isShow`).pipe(
          withSsr(playerSeemsLikePlayersIsShowKey),
          withAssign((_, name) => ({
            toggle: action((ctx, inputValue?: boolean) => {
              const isInputed = typeof inputValue !== 'undefined'

              const value = isInputed ? inputValue : !ctx.get(playerSLPState.settings.isShow);

              setCookie(playerSeemsLikePlayersIsShowKey, String(value), {
                maxAgeMs: dayjs().add(1, "month").diff(dayjs()), path: "/"
              })

              playerSLPState.settings.isShow(ctx, value);

              if (!isInputed) {
                if (!value) {
                  toast.success(`Блок скрыт на 30 дней`)
                }
              }
            }, `${name}.toggle`)
          }))
        )
      }))
    )
  }))
)

export const playerSLP = atom(null, "playerSLP").pipe(
  withAssign((_, name) => ({
    refetchAll: action((ctx) => {
      playerSLP.fetch.dataAtom.reset(ctx)
      playerSLP.fetch(ctx)
    }),
    fetch: reatomAsync(async (ctx) => {
      let nickname = ctx.get(playerParamAtom)

      if (!nickname) {
        nickname = await take(ctx, playerParamAtom)
      }

      if (!nickname) return null;

      const result = await ctx.schedule(() =>
        client
          .get<SeemsLikePlayersPayload>(`server/seems-like/${nickname}`, {
            signal: ctx.controller.signal,
            searchParams: { limit: 8 }
          })
          .exec()
      )

      return result
    }, {
      name: `${name}.fetch`
    }).pipe(
      withDataAtom(null),
      withStatusesAtom()
    )
  }))
)

playerParamAtom.onChange((ctx, state) => state && playerSLP.refetchAll(ctx))