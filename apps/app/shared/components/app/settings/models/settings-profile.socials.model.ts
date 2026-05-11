import { currentUserState } from "@/shared/models/current-user/index.model";
import { action, atom, reatomAsync, reatomMap, withAssign, withCache, withDataAtom, withReset, withStatusesAtom } from "@reatom/framework";
import { isEmptyArray } from "@/shared/lib/helpers";
import { client } from "@/shared/lib/client-wrapper";
import { toast } from "sonner";
import { getPlayerSocials, type PlayerSocialsPayload } from "../../player/models/socials.model";
import { logError } from "@/shared/lib/log";

export const profileSocials = atom(null, "profileSocials").pipe(
  withAssign((_, name) => ({
    fetch: reatomAsync(async (ctx) => {
      const nickname = ctx.get(currentUserState)!.nickname;

      return await ctx.schedule(() =>
        getPlayerSocials(nickname, { signal: ctx.controller.signal })
      );
    }, `${name}.fetch`).pipe(
      withDataAtom([]),
      withCache({ swr: false }),
      withStatusesAtom()
    ),
    fetchAvailable: reatomAsync(async (ctx) => {
      return await ctx.schedule(() =>
        client
          .get<SocialAvailablePayload[]>("server/socials/available", {
            signal: ctx.controller.signal
          })
          .exec()
      )
    }, `${name}.fetchAvailable`).pipe(
      withDataAtom([], (_, data) => isEmptyArray(data) ? null : data),
      withCache({ swr: false }),
      withStatusesAtom()
    ),
    removeWrapper: reatomAsync(async (ctx, type: PlayerSocialsPayload["type"]) => {
      socialStatusAtom.getOrCreate(ctx, type, () => true)

      const remove = reatomAsync(async (ctx, type: PlayerSocialsPayload["type"]) => {
        const result = await ctx.schedule(() =>
          client.delete<{ type: PlayerSocialsPayload["type"] }>(`server/socials/${type}`).exec()
        )

        return { result, type }
      }, {
        name: "profileSocialRemoveAction",
        onFulfill: (ctx, res) => {
          profileSocials.fetch.cacheAtom.reset(ctx)
          profileSocials.fetch.dataAtom(ctx, (state) => state.filter(t => t.type !== res.type))
        },
        onReject: (ctx, e) => {
          toast.error("Не удалось удалить социальную сеть.")
        }
      }).pipe(
        withStatusesAtom()
      )

      try {
        const result = await remove(ctx, type)
        return { result, type }
      } catch (e) {
        return { type }
      }
    }, {
      name: `${name}.removeWrapper`,
      onFulfill: (ctx, { type, result }) => {
        if (result) {
          if (result.type === type) {
            socialStatusAtom.delete(ctx, type)
          }
        } else {
          socialStatusAtom.delete(ctx, type)
        }
      }
    }),
    add: reatomAsync(async (ctx) => {
      const social = ctx.get(socialForAddState.selected);

      return await ctx.schedule(() =>
        client.post<"started">("server/socials/add", { json: { social } }).exec()
      )
    }, {
      name: `${name}.add`,
      onFulfill: (ctx, res) => {
        if (!res) return;


      },
      onReject: (ctx, e) => {
        logError({ type: "combined" })
      }
    }).pipe(
      withStatusesAtom()
    )
  }))
)

const socialStatusAtom = reatomMap<string, boolean>()

export const getSocialStatusAtom = (type: string) => atom((ctx) => ctx.spy(socialStatusAtom).get(type) ?? false)

type SocialAvailablePayload = {
  title: string, social: PlayerSocialsPayload["type"]
}

export const socialForAddState = atom(null, "socialForAddState").pipe(
  withAssign((_, name) => ({
    selected: atom<Nullable<PlayerSocialsPayload["type"]>>(null, `${name}.selected`).pipe(withReset()),
    isProcessing: atom(false, `${name}.isProcessing`).pipe(withReset())
  }))
)

export const socialForAdd = atom(null, "socialAdd").pipe(
  withAssign((_, name) => ({
    selectSocial: action((ctx, social: PlayerSocialsPayload["type"]) => {

      socialForAddState.selected(ctx, social)
      socialForAddState.isProcessing(ctx, true)
    }, `${name}.socialAdd`)
  }))
)