import { Avatar } from "@/shared/ui/avatar";
import { createLink, Link } from "@/shared/components/config/link";
import { isEmptyArray } from "@/shared/lib/helpers";
import { pageState } from "@/shared/models/page-context.model";
import { PageLoader } from "@/shared/ui/page-loader";
import { reatomComponent, useAtom } from "@reatom/npm-react";
import { Typography } from "@/shared/ui/typography"
import { player, type RateUser } from "@/shared/components/app/player/models/player.model";
import { createPageModel } from "@/shared/lib/events";
import { usePageContext } from "vike-react/usePageContext";
import { BackButton } from "@/shared/ui/back-button";
import type { PropsWithChildren } from "react";
import { Noop } from "@/shared/ui/noop";

const ListCard = ({ initiator, avatar }: RateUser) => {
  return (
    <div className="flex flex-col items-center min-w-0 w-full justify-center gap-2 bg-neutral-900 rounded-xl p-2">
      <Link href={createLink("player", initiator)}>
        <Avatar nickname={initiator} url={avatar} className="size-16" />
      </Link>
      <Link href={createLink("player", initiator)} className="flex flex-col w-full min-w-0 overflow-hidden">
        <Typography className="block font-semibold text-nowrap text-center truncate">
          {initiator}
        </Typography>
      </Link>
    </div>
  )
}

const RateList = reatomComponent(({ ctx }) => {
  if (!ctx.spy(pageState.isClientside) || ctx.spy(player.rate.fetchList.statusesAtom).isPending) {
    return <PageLoader />
  }

  const data = ctx.spy(player.rate.fetchList.dataAtom)?.data;
  if (!data || isEmptyArray(data)) return <Noop title="пусто" />

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 auto-rows-auto gap-2 w-full h-full">
      {data.map(user => <ListCard key={user.initiator} {...user} />)}
    </div>
  )
}, "RateList")

const page = createPageModel({
  name: "player-rates",
  onConnAction: (ctx) => {
    const nickname = ctx.get(pageState.routeParams).nickname;
    player.rate.refetchAll(ctx, nickname)
  },
  onDisconnAction: (ctx) => {
    player.rate.fetchList.abort(ctx)
  },
})

const PageHeaderWrapper = ({ children, href }: PropsWithChildren & Partial<{ href: string }>) => {
  return (
    <div className="flex items-center gap-2 w-full justify-start">
      <BackButton href={href} />
      {children}
    </div>
  )
}

export default function Page() {
  const [_] = useAtom(page.dataAtom)
  const nickname = usePageContext().routeParams.nickname;

  return (
    <div className='flex flex-col gap-8 w-full h-full'>
      <PageHeaderWrapper href={createLink("player", nickname)}>
        <Typography variant="title">Оценившие {nickname}</Typography>
      </PageHeaderWrapper>
      <RateList />
    </div>
  )
}
