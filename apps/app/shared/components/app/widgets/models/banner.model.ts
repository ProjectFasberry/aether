import { client } from "@/shared/lib/client-wrapper";
import { logError } from "@/shared/lib/log";
import { appState } from "@/shared/models/app/base.model";
import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/framework";
import { action, atom } from "@reatom/framework";
import { withAssign } from "@reatom/framework";

type BannerPayload = ExtractApiData<"getSharedBannerLatest">["data"]

export const bannerIsExistsAtom = atom((ctx) => ctx.spy(appState.options)?.flags?.isBanner, "bannerIsExists")
bannerIsExistsAtom.onChange((ctx, state) => state && banner.fetch(ctx))

export const banner = atom(null, "banner").pipe(
  withAssign((_, name) => ({
    refetchAll: action((ctx) => {
      banner.fetch.cacheAtom.reset(ctx)
      banner.fetch.dataAtom.reset(ctx);
    }),
    fetch: reatomAsync(async (ctx) => {
      return await ctx.schedule(() =>
        client<BannerPayload | null>("shared/banner/latest").exec()
      )
    }, `${name}.fetch`).pipe(
      withDataAtom(null),
      withCache({ swr: false }),
      withStatusesAtom()
    ),
    createView: reatomAsync(async (ctx, id: number) => {
      return await ctx.schedule(() =>
        client.post<unknown>(`shared/banner/view/${id}`).exec()
      )
    }, {
      name: `${name}.createView`,
      onFulfill: (ctx, res) => {
        // appState.options(ctx, (state) => ({ ...state, bannerIsExists: false }))
        banner.refetchAll(ctx)
      },
      onReject: (ctx, e) => logError(e)
    }).pipe(
      withStatusesAtom()
    )
  }))
)