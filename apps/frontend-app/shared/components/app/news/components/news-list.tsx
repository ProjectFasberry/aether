import { atom } from "@reatom/framework"
import { news, newsAllDataArrAtom, newsState, NewsViewer } from "../models/news-list.model"
import { NotFound } from "@/shared/ui/not-found"
import { reatomComponent, useUpdate } from "@reatom/npm-react"
import { PageLoader } from "@/shared/ui/page-loader"
import { isEmptyArray } from "@/shared/lib/helpers"
import { Typography } from "@/shared/ui/typography"
import { createLink, Link } from "@/shared/components/config/link"
import { NewsFilters } from "./news-list-filters"

const newsNotFoundTitleAtom = atom((ctx) => {
  const data = ctx.get(newsState.searchQuery)
  if (data) return `Ничего не нашлось по запросу "${data}"`

  return "Пока ничего нет"
}, "newsNotFoundTitle")

const NewsListNotFound = reatomComponent(({ ctx }) =>
  <NotFound title={ctx.spy(newsNotFoundTitleAtom)} />
)

const NewsList = reatomComponent(({ ctx }) => {
  if (ctx.spy(news.fetch.statusesAtom).isPending) return <PageLoader />

  const data = ctx.spy(newsAllDataArrAtom);

  if (!data || isEmptyArray(data)) {
    return <NewsListNotFound />
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 auto-rows-auto gap-2 sm:gap-4 w-full h-full">
      {data.map((news) => (
        <div key={news.id} className="flex flex-col gap-4 bg-neutral-900 w-full rounded-xl p-3 sm:p-4">
          <div className="h-20 sm:h-36 w-full overflow-hidden rounded-lg">
            <img src={news.imageUrl} loading="lazy" alt="" className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-col gap-1 w-full">
            <Typography className="text-lg leading-5 font-semibold truncate">
              {news.title}
            </Typography>
            <Link href={createLink("news", news.id)}>
              <Typography className="text-neutral-400 font-semibold text-sm">
                прочитать
              </Typography>
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}, "NewsList")

export const NewsContent = () => {
  useUpdate(news.fetch, [])

  return (
    <div className="flex flex-col gap-4 h-full w-full">
      <NewsFilters />
      <div className="flex flex-col w-full h-full">
        <NewsList />
        <NewsViewer />
      </div>
    </div>
  )
}
