import { reatomComponent, useUpdate } from "@reatom/npm-react";
import { playerActivity, PlayerActivityPayload } from "../models/activity.model";
import { Skeleton } from "@repo/ui/skeleton";
import { Typography } from "@repo/ui/typography";
import { isClientAtom } from "@/shared/models/page-context.model";
import { expImage } from "@/shared/consts/images";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@repo/ui/dialog";
import { onConnect, sleep } from "@reatom/framework";
import { playerState } from "../models/player.model";
import { translate } from "@/shared/locales/helpers";

const PlayerLocation = reatomComponent<{ nickname: string }>(({ ctx, nickname }) => {
  useUpdate((ctx) => playerActivity.location.fetch(ctx, nickname), [nickname]);

  if (ctx.spy(playerActivity.location.fetch.statusesAtom).isPending) {
    return <Skeleton className="h-6 w-48" />
  }

  const data = ctx.spy(playerActivity.location.fetch.dataAtom);
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
  const { server, nickname } = ctx.get(playerActivity.online.fetch.dataAtom) as Extract<PlayerActivityPayload, { type: "online" }>

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

onConnect(playerActivity.online.fetch.dataAtom, async (ctx) => {
  while (ctx.isConnected()) {
    await playerActivity.online.fetch.retry(ctx).catch(() => { })
    await ctx.schedule(() => sleep(60000))
  }
})

const PlayerActivitySkeleton = () => {
  return (
    <div className="flex flex-col gap-1 items-start justify-start w-full bg-neutral-900 rounded-xl p-4">
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-6 w-36" />
    </div>
  )
}

export const PlayerActivity = reatomComponent(({ ctx }) => {
  const nickname = ctx.spy(playerState.nickname);

  useUpdate((ctx) => {
    if (!nickname) return;
    
    playerActivity.online.fetch(ctx, nickname)
  }, [nickname])

  const data = ctx.spy(playerActivity.online.fetch.dataAtom);

  if (!ctx.spy(isClientAtom) || ctx.spy(playerActivity.online.fetch.statusesAtom).isPending) {
    return <PlayerActivitySkeleton />
  }

  if (!data) return null;

  const isOnline = data.type === 'online'

  return (
    <div className="flex flex-col gap-2 w-full bg-neutral-900 rounded-xl p-4">
      <div className="flex items-center gap-2">
        {isOnline && <img src={expImage} alt="" width={22} height={22} />}
        <Typography className="font-semibold text-lg">
          {isOnline ? translate["player.activity.online"]() : translate["player.activity.offline"]()}
        </Typography>
      </div>
      {isOnline && <PlayerServer />}
    </div>
  )
}, "PlayerActivity")