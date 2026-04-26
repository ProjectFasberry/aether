import { client } from "@/shared/lib/client-wrapper";
import { logRouting } from "@/shared/lib/log";
import { getStaticImage } from "@/shared/lib/volume-helpers";
import { wrapTitle } from "@/shared/lib/wrap-title";
import { useConfig } from "vike-react/useConfig";
import { render } from "vike/abort";
import { PageContextServer } from "vike/types";
import { createCtx } from "@reatom/core";
import { mergeSnapshot } from "@/shared/lib/snapshot";
import { newsState } from "@/shared/components/app/news/models/news.model";

export type Data = Awaited<ReturnType<typeof data>>;
export type News = ExtractApiData<"getSharedNewsById">["data"]

async function getNewsById(id: string, init: RequestInit) {
  return client<News>(`shared/news/${id}`, init).exec()
}

function metadata(
  news: News
) {
  return {
    title: wrapTitle(news.title),
    description: news.description.slice(0, 256),
    image: getStaticImage(news.imageUrl!.slice(1))
  }
}

async function loadNews(id: string, headers?: Record<string, string>): Promise<News | null> {
  try {
    const news = await getNewsById(id, { headers })
    return news
  } catch (e) {
    return null;
  }
}

export async function data(pageCtx: PageContextServer) {
  logRouting(pageCtx.urlPathname, "data");

  const config = useConfig()
  const headers = pageCtx.headers ?? undefined;
  const id = pageCtx.routeParams.id

  const news = await loadNews(id, headers)
  if (!news) throw render("/not-exist")

  config(metadata(news))

  const ctx = createCtx()

  newsState.item(ctx, news)
  pageCtx.snapshot = mergeSnapshot(ctx, pageCtx)
}