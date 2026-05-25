import { Skeleton } from "@/shared/ui/skeleton"
import { landsAction } from "../models/lands.model"
import { reatomComponent, useUpdate } from "@reatom/npm-react"
import { createLink, Link } from "@/shared/components/config/link"
import { tv } from 'tailwind-variants'
import { Typography } from "@/shared/ui/typography"
import { FormattedText } from "../../land/components/land-title"
import { DefaultBanner } from "../../land/components/land-banner"
import { Avatar } from "../../../../ui/avatar"
import { IconCircleFilled } from "@tabler/icons-react"
import { MasonryGrid } from "@repo/ui/masonry-grid"
import { NotFound } from "@/shared/ui/not-found"
import { pageState } from "@/shared/models/page-context.model"
import { scrollableVariant } from "@/shared/consts/style-variants"
import { translate } from "@/shared/locales/helpers"
import { atom } from "@reatom/framework"

type Lands = ExtractApiData<"getServerLandsList">["data"]["data"][number]

const landCardVariants = tv({
  base: `flex items-start justify-between gap-6 duration-150 relative w-full rounded-xl p-3 sm:p-4 lg:p-6 bg-neutral-900`,
  slots: {
    child: "flex flex-col gap-3 overflow-hidden",
    stat: "inline-flex items-center gap-2 text-base"
  }
})

const LandCard = ({ level, members, name, title, ulid, details: { banner } }: Lands) => {
  return (
    <Link href={createLink("land", ulid)} className={landCardVariants().base()}>
      <div className={landCardVariants().child()}>
        <div className="flex items-center gap-2 w-full">
          <Avatar
            nickname={members[0].nickname}
            url={members[0].avatar}
            className="h-6 w-6"
          />
          <Typography className="text-lg truncate">
            {members[0].nickname}
          </Typography>
        </div>
        <Typography className="text-xl truncate font-semibold">
          {name}
        </Typography>
        {title && <FormattedText text={title} />}
        <div className="flex flex-col select-none gap-1">
          <Typography className={landCardVariants().stat()}>
            <IconCircleFilled size={8} />
            {members.length} {translate["shared.lands.single.attributes.members"]()}
          </Typography>
          <Typography className={landCardVariants().stat()}>
            <IconCircleFilled size={8} />
            {level} {translate["shared.lands.single.attributes.level"]()}
          </Typography>
        </div>
      </div>
      <DefaultBanner banner={banner} variant="small" />
    </Link >
  )
}

const masonryOpts = {
  columnConfig: {
    default: 1,
    640: 2,
    1024: 3,
    1280: 3,
  },
  columnGap: 6,
  rowGap: 6
}

const SKELETON_HEIGHTS = ['h-32', 'h-44', 'h-36', 'h-40', 'h-56', 'h-64', 'h-72'];
const SKELETON_COUNT = 12;

const randomHeightsAtom = atom(Array.from({ length: SKELETON_COUNT }).map(() => {
  const randomIdx = Math.floor(Math.random() * SKELETON_HEIGHTS.length);
  return SKELETON_HEIGHTS[randomIdx];
}))

const LandsSkeleton = reatomComponent(({ ctx }) => {
  const randomHeights = ctx.spy(randomHeightsAtom)

  return (
    <MasonryGrid
      {...masonryOpts}
      items={randomHeights}
      renderItem={((height, idx) => <Skeleton key={idx} className={`${height} w-full`} />)}
    />
  )
}, "LandsSkeleton")

const landsListVariant = scrollableVariant({ className: "flex rounded-lg scrollbar-h-2 overflow-x-auto gap-4 pb-2" })

const LandsListShortedSkeleton = () => {
  return (
    <div className={landsListVariant}>
      <Skeleton className="h-44 w-full" />
      <Skeleton className="h-44 w-full" />
      <Skeleton className="h-44 w-full" />
    </div>
  )
}

export const LandsListShorted = reatomComponent(({ ctx }) => {
  useUpdate((ctx) => landsAction(ctx, { limit: 3 }), []);

  if (!ctx.spy(pageState.isClientside) || ctx.spy(landsAction.statusesAtom).isPending) {
    return <LandsListShortedSkeleton />
  }

  const data = ctx.spy(landsAction.dataAtom)
  if (!data) {
    return <NotFound title={translate["shared.empty"]()} />
  }

  return (
    <div className="flex flex-col w-full gap-2">
      <div className={landsListVariant}>
        {data.map((land) => <LandCard key={land.ulid} {...land} />)}
      </div>
      {data.length > 3 && (
        <Link href="/lands?from=index" className="flex self-end w-fit">
          <Typography className="font-semibold text-neutral-400">
            {translate["shared.lands.list.showMore"]()}
          </Typography>
        </Link>
      )}
    </div>
  )
}, "LandsListShorted")

export const LandsList = reatomComponent(({ ctx }) => {
  if (!ctx.spy(pageState.isClientside) || ctx.spy(landsAction.statusesAtom).isPending) {
    return <LandsSkeleton />
  }

  const data = ctx.spy(landsAction.dataAtom)
  if (!data) return <NotFound title={translate["shared.empty"]()} />

  return (
    <MasonryGrid
      items={data}
      renderItem={(land) => <LandCard key={land.ulid} {...land} />}
      {...masonryOpts}
    />
  )
}, "LandsList")