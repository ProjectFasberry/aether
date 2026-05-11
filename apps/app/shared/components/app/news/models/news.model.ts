import { client, withQueryParams } from "@/shared/lib/client-wrapper"
import { atom } from "@reatom/framework";
import { withSsr } from "@/shared/models/ssr";
import { withAssign } from "@reatom/framework";

type NewsPayload = ExtractApiData<"getSharedNewsList">["data"]
type NewsItem = ExtractApiData<"getSharedNewsById">["data"]

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
    item: atom<Nullable<NewsItem>>(null, `${name}.item`).pipe(withSsr(`${name}.item`))
  }))
)