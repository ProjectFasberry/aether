import { client } from "@/shared/lib/client-wrapper";
import { logRouting } from "@/shared/lib/log";
import { getStaticImage } from "@/shared/lib/volume-helpers";
import { wrapTitle } from "@/shared/lib/utils";
import { useConfig } from "vike-react/useConfig";
import { render } from "vike/abort";
import { type PageContextServer } from "vike/types";
import { createCtx } from "@reatom/framework";
import { snapshots } from "@/shared/models/ssr";
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

export async function data(pageCtx: PageContextServer) {
  const config = useConfig()

  const headers = pageCtx.headers
  if (!headers) return;

  logRouting(pageCtx.urlPathname, "data");

  const id = pageCtx.routeParams.id

  const news = await getNewsById(id, { headers }).catch(e => {
    console.error("News error", e)
    return null;
  })

  if (!news) throw render("/not-exist")

  config(metadata(news))

  const ctx = createCtx()
  newsState.item(ctx, news)
  
  pageCtx.snapshot = snapshots.merge(ctx, pageCtx)
}