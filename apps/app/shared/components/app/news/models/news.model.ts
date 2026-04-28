import { client, withQueryParams } from "@/shared/lib/client-wrapper"
import { atom } from "@reatom/core";
import { withSsr } from "@/shared/lib/reatom-helpers";
import { withAssign } from "@reatom/framework";

type NewsPayload = ExtractApiData<"getSharedNewsList">["data"]
type News = ExtractApiData<"getSharedNewsById">["data"]

export const getNews = async (
  params: Partial<{ content?: boolean, limit: number, asc: boolean }>, 
  init?: RequestInit
) => {
  return client
    .get<NewsPayload>("shared/news/list", {
      ...init,
      throwHttpErrors: false,
    })
    .pipe(withQueryParams(params))
    .exec()
}

export const newsState = atom(null, "newsState").pipe(
  withAssign((_, name) => ({
    data: atom<NewsPayload["data"]>([], `${name}.data`).pipe(withSsr(`${name}.data`)),
    item: atom<News | null>(null, `${name}.item`).pipe(withSsr(`${name}.item`))
  }))
)