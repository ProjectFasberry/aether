import { reatomComponent, useUpdate } from "@reatom/npm-react"
import { Skeleton } from "@repo/ui/skeleton"
import { Typography } from "@repo/ui/typography"
import { newsAction } from "../models/news.model"
import { createLink, Link } from "@/shared/components/config/link"
import { AtomState } from "@reatom/framework"
import { NotFound } from "@/shared/ui/not-found"
import { isClientAtom } from "@/shared/models/page-context.model"
import { tv } from "tailwind-variants"
import { scrollableVariant } from "@/shared/consts/style-variants"

const NewsItemSkeleton = () => {
  return (
    <div className={newsItemVariant().base()}>
      <Skeleton className="w-full h-[200px]" />
      <div className={newsItemVariant().content()}>
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  )
}

const NewsSkeleton = () => {
  return (
    <>
      <NewsItemSkeleton />
      <NewsItemSkeleton />
      <NewsItemSkeleton />
    </>
  )
}

const newsItemVariant = tv({
  base: `
    flex flex-col flex-shrink-0 md:flex-[0_0_calc((100%/2)-0.5rem)] w-full lg:flex-1 
    h-56 sm:h-72 bg-neutral-900 rounded-xl overflow-hidden
  `,
  slots: {
    img: `object-cover h-[148px] sm:h-[200px]`,
    content: `flex flex-col gap-1 justify-between p-2 sm:p-4 w-full`
  }
})

const NewsItem = ({
  id, description, title, imageUrl
}: NonNullable<AtomState<typeof newsAction.dataAtom>>[number]) => {
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
            подробнее
          </Typography>
        </Link>
      </div>
    </div>
  )
}

const NewsList = reatomComponent(({ ctx }) => {
  if (!ctx.spy(isClientAtom) || ctx.spy(newsAction.statusesAtom).isPending) {
    return <NewsSkeleton />
  }

  const data = ctx.spy(newsAction.dataAtom)
  if (!data) return <NotFound title="Новостей нет" />

  return data.map(news => <NewsItem key={news.id} {...news} />)
}, "NewsList")

export const News = () => {
  useUpdate(newsAction, []);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <Typography className="text-3xl font-bold">
        Новости
      </Typography>
      <div className={scrollableVariant({ className: "flex scrollbar-h-2 overflow-x-auto gap-4 pb-2" })}>
        <NewsList />
      </div>
    </div>
  )
}