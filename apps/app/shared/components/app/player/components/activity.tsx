import { reatomComponent, useUpdate } from "@reatom/npm-react";
import { playerActivityAction, playerLocationAction } from "../models/activity.model";
import { Skeleton } from "@repo/ui/skeleton";
import { Typography } from "@repo/ui/typography";
import { isClientAtom } from "@/shared/models/page-context.model";
import { expImage } from "@/shared/consts/images";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@repo/ui/dialog";
import { PlayerActivityPayload } from "@repo/shared/types/entities/user";
import { onConnect, sleep } from "@reatom/framework";
import { playerParamAtom } from "../models/player.model";

const PlayerLocation = reatomComponent<{ nickname: string }>(({ ctx, nickname }) => {
  useUpdate((ctx) => playerLocationAction(ctx, nickname), [nickname]);

  const data = ctx.spy(playerLocationAction.dataAtom);

  if (ctx.spy(playerLocationAction.statusesAtom).isPending) {
    return <Skeleton className="h-6 w-48" />
  }

  if (!data) return null;

  return (
    <div className="flex flex-col items-start overflow-x-auto gap-2 w-full">
      <div className="flex items-center min-w-0 truncate gap-2 w-full">
        <Typography>
          Мир: {data.world}
        </Typography>
        <Typography>
          x: {data.x} y:{data.y} z:{data.z} pitch: {data.pitch} yaw: {data.yaw}
        </Typography>
      </div>
      <Typography className="min-w-0 truncate">
        {data.customLocation}
      </Typography>
    </div>
  )
}, "PlayerLocation")

const PlayerServer = reatomComponent(({ ctx }) => {
  const { server, nickname } = ctx.get(playerActivityAction.dataAtom) as Extract<PlayerActivityPayload, { type: "online" }>

  return (
    <Dialog>
      {server === 'Lobby' ? (
        <div className="flex justify-start cursor-pointer items-center overflow-x-auto gap-2 w-full">
          <Typography className="text-neutral-400 font-semibold text-sm">
            на сервере <span className="text-neutral-50">{server}</span>
          </Typography>
        </div>
      ) : (
        <DialogTrigger>
          <div className="flex justify-start cursor-pointer items-center overflow-x-auto gap-2 w-full">
            <Typography className="text-neutral-400 font-semibold text-sm">
              на сервере <span className="text-neutral-50">{server}</span>
            </Typography>
          </div>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogTitle className="text-center text-xl">Локация игрока</DialogTitle>
        <PlayerLocation nickname={nickname} />
      </DialogContent>
    </Dialog>
  )
}, "PlayerLocation")

onConnect(playerActivityAction.dataAtom, (ctx) => {
  const nickname = ctx.get(playerParamAtom)
  playerActivityAction(ctx, nickname!)
})

onConnect(playerActivityAction.dataAtom, async (ctx) => {
  while (ctx.isConnected()) {
    await playerActivityAction.retry(ctx).catch(() => { })
    await ctx.schedule(() => sleep(60000))
  }
})

export const PlayerActivity = reatomComponent(({ ctx }) => {
  if (!ctx.spy(isClientAtom)) {
    return (
      <div className="flex flex-col gap-1 items-start justify-start w-full border border-neutral-600 rounded-xl p-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-6 w-36" />
      </div>
    )
  }

  const data = ctx.spy(playerActivityAction.dataAtom);

  if (ctx.spy(playerActivityAction.statusesAtom).isPending) {
    return (
      <div className="flex flex-col gap-1 items-start justify-start w-full border border-neutral-600 rounded-xl p-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-6 w-36" />
      </div>
    )
  }

  if (!data) return null;

  const isOnline = data.type === 'online'

  return (
    <div className="flex flex-col gap-2 w-full border border-neutral-600 rounded-xl p-4">
      <div className="flex items-center gap-2">
        {isOnline && <img src={expImage} alt="" width={22} height={22} />}
        <Typography className="font-semibold text-lg">
          {isOnline ? "Онлайн" : "Оффлайн"}
        </Typography>
      </div>
      {isOnline && <PlayerServer />}
    </div>
  )
}, "PlayerActivity")