import { reatomComponent } from "@reatom/npm-react"
import { Typography } from "@/shared/ui/typography"
import { createLink, Link } from "@/shared/components/config/link"
import { NotFound } from "@/shared/ui/not-found"
import { tv } from "tailwind-variants"
import { newsState } from "../models/news.model"
import { isEmptyArray } from "@/shared/lib/helpers"
import { translate } from "@/shared/locales/helpers"

type NewsPayload = ExtractApiData<"getSharedNewsList">["data"]

const newsItemVariant = tv({
  base: `
    flex flex-col flex-shrink-0 md:flex-[0_0_calc((100%/2)-0.5rem)] w-full lg:flex-1 
    h-57 sm:h-72 bg-neutral-900 rounded-xl overflow-hidden
  `,
  slots: {
    img: `object-cover h-[148px] sm:h-[200px]`,
    content: `flex flex-col gap-1 justify-between p-3 sm:p-4 w-full`
  }
})

const NewsItem = ({ id, title, imageUrl }: NewsPayload["data"][number]) => {
  return (
    <div className={newsItemVariant().base()}>
      <img
        draggable={false}
        src={imageUrl!}
        alt=""
        width={1920}
        loading="lazy"
        height={1080}
        className={newsItemVariant().img()}
      />
      <div className={newsItemVariant().content()}>
        <Typography className="text-lg font-semibold text-nowrap truncate">
          {title}
        </Typography>
        <Link href={createLink("news", id)} className="w-fit">
          <Typography className="text-neutral-400">
            {translate["shared.news.single.showMore"]()}
          </Typography>
        </Link>
      </div>
    </div>
  )
}

export const NewsList = reatomComponent(({ ctx }) => {
  const data = ctx.spy(newsState.data)

  if (!data || isEmptyArray(data)) {
    return <NotFound title={translate["shared.empty"]()} />
  }

  return data.map(news => <NewsItem key={news.id} {...news} />)
}, "NewsList")