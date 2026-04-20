import { reatomComponent, useUpdate } from "@reatom/npm-react"
import { Button } from "@repo/ui/button"
import { IconHeart } from "@tabler/icons-react"
import { tv } from "tailwind-variants"
import { playerRate, RateUser } from "../models/rate.model"
import { isIdentityAtom } from "../models/player.model"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@repo/ui/hover-card"
import { Typography } from "@repo/ui/typography"
import { createLink, Link } from "@/shared/components/config/link"
import { Avatar } from "../../avatar/components/avatar"
import dayjs from "@/shared/lib/create-dayjs"
import { Skeleton } from "@repo/ui/skeleton"
import { currentUserAtom } from "@/shared/models/current-user.model"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@repo/ui/sheet"

const likeButtonVariants = tv({
  base: `flex border-2 group rounded-full duration-300 px-3 py-1 *:duration-300 items-center gap-2`,
  variants: {
    variant: {
      inactive: "border-neutral-700",
      active: "border-red-600/90 bg-red-500/70 backdrop-blur-md",
      filled: "bg-neutral-50 active:scale-100"
    }
  },
  defaultVariants: {
    variant: "inactive"
  }
})

const rateButtonChildVariants = tv({
  base: `text-lg`,
  variants: {
    variant: {
      default: "",
      rated: `group-data-[state=rated]:fill-neutral-50 group-data-[state=rated]:text-neutral-50`,
      filled: `group-data-[state=filled]:text-neutral-900 group-data-[state=filled]:fill-neutral-900`,
    }
  }
})

type RateProps = {
  isRated: boolean,
  nickname: string,
  count: number
}

const ListCard = ({ initiator, created_at }: RateUser) => {
  return (
    <div className="flex items-center gap-2 bg-neutral-800 rounded-lg p-2">
      <Link href={createLink("player", initiator)}>
        <Avatar
          nickname={initiator}
          propWidth={32}
          propHeight={32}
          className="min-h-8 min-w-8 aspect-square"
        />
      </Link>
      <div className="flex flex-col">
        <Link href={createLink("player", initiator)}>
          <Typography className="text-base font-semibold">
            {initiator}
          </Typography>
        </Link>
        <Typography color="gray" className="text-sm leading-3">
          {dayjs(created_at).fromNow()}
        </Typography>
      </div>
    </div>
  )
}

const List = reatomComponent(({ ctx }) => {
  useUpdate(playerRate.fetchList, []);

  const data = ctx.spy(playerRate.fetchList.dataAtom)?.data;

  if (data && data.length === 0) {
    return <Typography color="gray">пусто</Typography>
  }

  if (!data) return null;

  return (
    <div className="flex flex-col overflow-y-auto max-h-[400px] gap-2 w-full h-full">
      {data.map(user => (
        <ListCard
          key={user.initiator}
          initiator={user.initiator}
          created_at={user.created_at}
        />
      ))}
    </div>
  )
}, "List")

const RateList = reatomComponent<Pick<RateProps, "count">>(({ ctx, count }) => {
  if (ctx.spy(playerRate.fetchList.statusesAtom).isPending && !ctx.spy(playerRate.fetchList.cacheAtom)) {
    return <Skeleton className="h-36 w-full" />
  }

  const currentUser = ctx.get(currentUserAtom)
  const isDisabled = !currentUser || ctx.spy(playerRate.rate.statusesAtom).isPending

  return (
    <>
      <div className="hidden sm:block">
        <HoverCard closeDelay={1} openDelay={1}>
          <HoverCardTrigger asChild>
            <Button
              data-state="filled"
              disabled={isDisabled}
              className={likeButtonVariants({ variant: "filled" })}
            >
              <IconHeart className={rateButtonChildVariants({ variant: "filled" })} />
              <span className={rateButtonChildVariants({ variant: "filled" })}>
                {count}
              </span>
            </Button>
          </HoverCardTrigger>
          <HoverCardContent>
            <List />
          </HoverCardContent>
        </HoverCard >
      </div>
      <div className="block sm:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              data-state="filled"
              disabled={ctx.spy(playerRate.rate.statusesAtom).isPending}
              className={likeButtonVariants({ variant: "filled" })}
            >
              <IconHeart className={rateButtonChildVariants({ variant: "filled" })} />
              <span className={rateButtonChildVariants({ variant: "filled" })}>
                {count}
              </span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="flex flex-col gap-4">
            <SheetTitle className="text-2xl text-left">Игроки, оценившие вас</SheetTitle>
            <List />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}, "RateList")

export const Rate = reatomComponent<RateProps>(({
  ctx, isRated, nickname, count
}) => {
  const isIdentity = ctx.spy(isIdentityAtom);
  if (isIdentity) return <RateList count={count} />

  const parentVariant = isRated ? "active" : "inactive"
  const childVariant = isRated ? "rated" : "default"
  
  return (
    <Button
      data-state={isRated ? "rated" : "unrated"}
      disabled={ctx.spy(playerRate.rate.statusesAtom).isPending}
      onClick={() => playerRate.rate(ctx, nickname)}
      className={likeButtonVariants({ variant: parentVariant })}
    >
      <IconHeart className={rateButtonChildVariants({ variant: childVariant })} />
      <span className={rateButtonChildVariants({ variant: childVariant })}>
        {count}
      </span>
    </Button>
  )
}, "Rate")