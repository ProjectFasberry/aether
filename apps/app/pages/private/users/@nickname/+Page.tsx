import { Avatar } from "@/shared/ui/avatar"
import { logError } from "@/shared/lib/log"
import { pageContextAtom } from "@/shared/models/page-context.model"
import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/async"
import { action, atom } from "@reatom/core"
import { reatomComponent, useUpdate } from "@reatom/npm-react"
import { Skeleton } from "@repo/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@repo/ui/tooltip"
import { Typography } from "@repo/ui/typography"
import dayjs from "@/shared/lib/create-dayjs"
import { PrivatedUser } from "@repo/shared/types/entities/other"
import { client } from "@/shared/lib/client-wrapper"
import { startPageEvents } from "@/shared/lib/events"

const targetPlayerNickname = atom<Nullable<string>>(null, "")

const playerAction = reatomAsync(async (ctx) => {
  const nickname = ctx.get(targetPlayerNickname)

  if (!nickname || nickname.trim() === "") {
    throw new Error("Nickname is not defined")
  }

  return await ctx.schedule(() =>
    client<PrivatedUser>(`privated/user/${nickname}`).exec()
  )
}, {
  name: "playerAction",
  onReject: (ctx, e) => {
    logError(e, { type: "combined" })
  }
}).pipe(withDataAtom(), withCache({ swr: false }), withStatusesAtom())

const UserInfo = reatomComponent(({ ctx }) => {
  const data = ctx.spy(playerAction.dataAtom);

  if (ctx.spy(playerAction.statusesAtom).isPending) {
    return (
      <div className="flex flex-col gap-1 w-full h-full">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  if (!data) return null;

  return (
    <div className="flex flex-col items-start gap-1 w-full h-full">
      <div className="flex items-center justify-center w-full h-full">
        <Avatar
          url={data.avatar}
          nickname={data.nickname}
          className="h-16 w-16"
        />
      </div>
      <Typography className="text-lg">
        ID: {data.id}
      </Typography>
      <Typography className="text-lg">
        Никнейм: {data.nickname} ({data.lower_case_nickname})
      </Typography>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Typography className="text-lg">
              Регистрация: {dayjs(data.created_at).fromNow()}
            </Typography>
          </TooltipTrigger>
          <TooltipContent>
            {dayjs(data.created_at).format("DD.MM.YYYY hh:mm")}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Typography className="text-lg">
        UUID: {data.uuid}
      </Typography>
      <Typography className="text-lg">
        Premium UUID: {data.premium_uuid}
      </Typography>
      <Typography className="text-lg">
        Роль: {data.role_name} {data.role_id}
      </Typography>
    </div>
  )
}, "UserInfo")

const events = action((ctx) => {
  const pageContext = ctx.get(pageContextAtom)
  if (!pageContext) return;

  const nickname = pageContext.routeParams.nickname;

  targetPlayerNickname(ctx, nickname)
  playerAction(ctx)
})

export default function Page() {
  useUpdate((ctx) => startPageEvents(ctx, events), [pageContextAtom])

  return <UserInfo />
}