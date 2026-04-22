import { client } from "@/shared/lib/client-wrapper";
import { logError } from "@/shared/lib/log";
import { appState } from "@/shared/models/app.model";
import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/async";
import { atom } from "@reatom/core";
import { BannerPayload } from "@repo/shared/types/entities/banner";

export const bannerIsExistsAtom = atom((ctx) => ctx.spy(appState.options).bannerIsExists, "bannerIsExists")

bannerIsExistsAtom.onChange((ctx, state) => {
  if (!state) return;

  bannerAction(ctx)
})

export const bannerAction = reatomAsync(async (ctx) => {
  return await ctx.schedule(() => 
    client<BannerPayload | null>("shared/banner/latest").exec()
  )
}, "bannerAction").pipe(withDataAtom(null), withCache({ swr: false }), withStatusesAtom())

export const viewBannerAction = reatomAsync(async (ctx, id: number) => {
  return await ctx.schedule(() => 
    client.post<unknown>(`shared/banner/view/${id}`).exec()
  )
}, {
  name: "viewBannerAction",
  onFulfill: (ctx, res) => {
    appState.options(ctx, (state) => ({ ...state, bannerIsExists: false }))
    bannerAction.cacheAtom.reset(ctx)
    bannerAction.dataAtom.reset(ctx);
  },
  onReject: (ctx, e) => {
    logError(e)
  }
}).pipe(withStatusesAtom())