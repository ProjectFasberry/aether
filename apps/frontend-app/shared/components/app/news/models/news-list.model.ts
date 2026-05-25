import { logError } from "@/shared/lib/log"
import {
  action, atom, batch, reatomAsync, reatomMap, sleep,
  withAssign, withCache, withConcurrency, withDataAtom, withStatusesAtom
} from "@reatom/framework"
import { getNews } from "./news.model"
import { createViewerModel } from "@/shared/models/shared.model"

type NewsPayload = ExtractApiData<"getSharedNewsList">["data"]

export const { Component: NewsViewer, inViewAtom: newsStateInView } = createViewerModel({
  name: "news-filter"
})

export const newsAllDataArrAtom = atom((ctx) =>
  Array.from(ctx.spy(newsState.allData).values()),
  "newsAllDataArr"
)

export const newsState = atom(null, "newsState").pipe(
  withAssign((_, name) => ({
    allOldData: reatomMap<number, NewsPayload["data"][number]>(new Map(), `${name}.allOldData`),
    allData: reatomMap<number, NewsPayload["data"][number]>(new Map(), `${name}.allData`),
    allMeta: atom<Nullable<NewsPayload["meta"]>>(null, `${name}.allMeta`),
    asc: atom(false, `${name}.asc`),
    searchQuery: atom("", `${name}.seachQuery`).pipe(
      withAssign((_, name) => ({
        onChangeEvent: action(async (ctx, e: React.ChangeEvent<HTMLInputElement>) => {
          newsState.searchQuery(ctx, e.target.value);

          await ctx.schedule(() => sleep(300))

          news.refetchAll(ctx)
        }, `${name}.onChangeEvent`).pipe(
          withConcurrency()
        )
      }))
    ),
    endCursor: atom<Nullable<string>>(null, `${name}.endCursor`)
  }))
)

export const news = atom(null, "news").pipe(
  withAssign((_, name) => ({
    refetchAll: action((ctx) => {
      news.fetch.cacheAtom.reset(ctx)
      news.fetch(ctx)
    }),
    fetch: reatomAsync(async (ctx) => {
      const opts = {
        asc: ctx.get(newsState.asc),
        searchQuery: ctx.get(newsState.searchQuery),
        endCursor: ctx.get(newsState.endCursor)
      }

      return await ctx.schedule(() =>
        getNews(opts, { signal: ctx.controller.signal })
      )
    }, {
      name: `${name}.fetch`,
      onFulfill: (ctx, res) => {
        if (!res) return;

        const fresh = res.data.map(d => [d.id, d] as const);
        const old = ctx.get(newsState.allOldData)

        batch(ctx, () => {
          newsState.allData(ctx, new Map([...old, ...fresh]))
          newsState.allMeta(ctx, res.meta)
        })
      },
      onReject: (_, e) => logError(e)
    }).pipe(
      withDataAtom(null),
      withStatusesAtom(),
      withCache({ swr: false })
    ),
    onIsViewEvent: action((ctx) => {
      const meta = ctx.get(newsState.allMeta)
      if (!meta) return;

      const hasNextPage = meta?.hasNextPage
      if (!hasNextPage) return;

      batch(ctx, () => {
        newsState.allOldData(ctx, ctx.get(newsState.allData))
        newsState.endCursor(ctx, meta.endCursor ?? null)
      })

      news.refetchAll(ctx)
    }, `${name}.onIsViewEvent`)
  }))
)

newsState.asc.onChange((ctx) => news.refetchAll(ctx))
newsStateInView.onChange((ctx, state) => state && news.onIsViewEvent(ctx))
