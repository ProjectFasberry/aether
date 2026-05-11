import { Avatar } from "@/shared/ui/avatar";
import { createLink, Link } from "@/shared/components/config/link";
import { isEmptyArray } from "@/shared/lib/helpers";
import { pageState } from "@/shared/models/page-context.model";
import { PageLoader } from "@/shared/ui/page-loader";
import { reatomComponent, useUpdate } from "@reatom/npm-react";
import { Typography } from "@repo/ui/typography";
import dayjs from "dayjs";
import { player, type RateUser } from "@/shared/components/app/player/models/player.model";

const ListCard = ({ initiator, created_at, avatar }: RateUser) => {
  return (
    <div className="flex items-center gap-2 bg-neutral-800 rounded-lg p-2">
      <Link href={createLink("player", initiator)}>
        <Avatar
          nickname={initiator}
          url={avatar}
          className="size-8 aspect-square"
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

const RateList = reatomComponent(({ ctx }) => {
  if (!ctx.spy(pageState.isClientside) || ctx.spy(player.rate.fetchList.statusesAtom).isPending) {
    return <PageLoader />
  }

  const data = ctx.spy(player.rate.fetchList.dataAtom)?.data;

  if (!data || isEmptyArray(data)) {
    return <Typography color="gray">пусто</Typography>
  }

  return (
    <div className="flex flex-col overflow-y-auto max-h-[400px] gap-2 w-full h-full">
      {data.map(user => (
        <ListCard
          key={user.initiator}
          initiator={user.initiator}
          created_at={user.created_at}
          avatar={user.avatar}
        />
      ))}
    </div>
  )
}, "RateList")

export default function Page() {
  useUpdate(player.rate.refetchAll, []);

  return (
    <div className='flex flex-col gap-8 w-full h-full'>
      <Typography variant="title">
        Оценившие вас
      </Typography>
      <RateList />
    </div>
  )
}