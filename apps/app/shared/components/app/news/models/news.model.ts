import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/async"
import { logError } from "@/shared/lib/log"
import { News, NewsPayload } from "@repo/shared/types/entities/news"
import { client, withQueryParams } from "@/shared/lib/client-wrapper"
import { atom } from "@reatom/core";
import { withSsr } from "@/shared/lib/reatom-helpers";

export const getNews = reatomAsync(async (
  ctx, params: Partial<{ content?: boolean, limit: number, asc: boolean }>
) => {
  return client
    .get<NewsPayload>("shared/news/list", {
      throwHttpErrors: false, 
      signal: ctx.controller.signal
    })
    .pipe(withQueryParams(params))
    .exec()
})

export const newsAction = reatomAsync(async (ctx) => {
  return await ctx.schedule(() => getNews(ctx, { limit: 3, asc: false }))
}, {
  name: "newsAction",
  onReject: (ctx, e) => {
    logError(e)
  }
}).pipe(
  withDataAtom(null, (_, data) => data.data.length === 0 ? null : data.data),
  withStatusesAtom(),
  withCache({ swr: false })
)

export const newsItemAtom = atom<News | null>(null, "newsItem").pipe(withSsr("news.item"))