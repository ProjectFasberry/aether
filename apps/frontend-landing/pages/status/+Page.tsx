import { MainWrapperPage } from "@repo/ui/main-wrapper";
import { Skeleton } from "@repo/ui/skeleton";
import { reatomComponent, useUpdate } from "@reatom/npm-react"
import { Typography, typographyVariants } from "@repo/ui/typography";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from '@repo/ui/dialog';
import { Link } from "@/shared/components/config/link";
import { getStaticObject } from '@/shared/lib/volume';
import { tv } from "tailwind-variants";
import { Button } from "@repo/ui/button";
import { usePageContext } from "vike-react/usePageContext";
import { APP_URL } from "@/shared/env";
import { client } from "@/shared/api/client"
import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/async"

export type Player = {
  uuid: string;
  name_raw: string;
};

export type PlayerStatusProps = {
  nickname: string
}

type ServerStatus = {
  proxy: {
    online: number,
    players: Array<string>,
    status: string,
    max: number
  },
  servers: {
    [key: string]: {
      online: number
    }
  }
}

const serverStatusAction = reatomAsync(async (ctx) => {
  return ctx.schedule(async () => {
    const res = await client("server/status", { searchParams: { type: "servers" }, signal: ctx.controller.signal })
    const data = await res.json<{ data: ServerStatus } | { error: string }>()
    if (!data || "error" in data) return null;
    return data.data;
  })
}, "serverStatusAction").pipe(withCache({ swr: false }), withDataAtom(), withStatusesAtom())

const serverTitle = tv({
  extend: typographyVariants,
  base: `text-md sm:text-base md:text-lg lg:text-xl`
})

const descTitle = tv({
  extend: typographyVariants,
  base: `text-md sm:text-base text-neutral-400 truncate md:text-lg lg:text-xl`
})

const StatusItem = reatomComponent(({ ctx }) => {
  const status = ctx.spy(serverStatusAction.dataAtom);
  const isLoading = ctx.spy(serverStatusAction.statusesAtom).isPending

  return (
    <div className="card-wrapper flex flex-col h-fit gap-4">
      <Typography className="text-xl lg:text-2xl">
        Статус
      </Typography>
      <div className="flex flex-col items-start gap-4">
        <div className="flex flex-col gap-2 w-full">
          <div className="grid grid-cols-[1fr_1fr] grid-rows-1 w-full bg-neutral-800 p-2 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center justify-center bg-neutral-700/40 rounded-lg p-2">
                <img
                  src={getStaticObject("minecraft", "items/netherite_sword.webp")}
                  alt=""
                  width={24}
                  draggable={false}
                  height={24}
                />
              </div>
              <Typography className={serverTitle()}>Bisquite</Typography>
            </div>
            <div className="flex items-center w-full justify-end gap-3">
              <Typography color="gray" className={descTitle()}>
                <span className="hidden sm:inline">играет</span> {status?.servers.bisquite.online ?? 0} игроков
              </Typography>
            </div>
          </div>
          <div className="grid grid-cols-[1fr_1fr] gap-2 grid-rows-1 w-full bg-neutral-800 p-2 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center justify-center bg-neutral-700/40 rounded-lg p-2">
                <img
                  src={getStaticObject("minecraft", "items/wild_armor_trim_ыmithing_еemplate.webp")}
                  alt=""
                  width={24}
                  draggable={false}
                  height={24}
                />
              </div>
              <Typography className={serverTitle()}>Muffin</Typography>
            </div>
            <div className="flex items-center w-full justify-end gap-3">
              <Typography color="gray" className={descTitle()}>
                <span className="hidden sm:inline">играет</span> {status?.servers.muffin.online} игроков
              </Typography>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between w-full">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Typography className={descTitle({ className: "text-right" })}>
                Всего:
              </Typography>
              <Skeleton className="h-8 w-8" />
            </div>
          ) : (
            <Typography className={descTitle({ className: "text-right" })}>
              Всего: {status?.proxy.online ?? 0}
            </Typography>
          )}
        </div>
      </div>
    </div>
  )
}, "StatusItem")

type PlayerStatusImageProps = {
  type?: "small" | "full"
} & PlayerStatusProps

const PlayerStatusImage = ({
  nickname, type = "small"
}: PlayerStatusImageProps) => {
  const { avatarUrl, isLoading } = { avatarUrl: null, isLoading: false }

  if (isLoading) {
    return <Skeleton className={`rounded-md ${type === 'small'
      ? 'max-w-[36px] max-h-[36px]'
      : 'max-w-[164px] max-h-[164px]'}`
    }
    />
  }

  if (!avatarUrl) return null;

  return (
    <img
      height={800}
      width={800}
      className={`rounded-md ${type === 'small'
        ? 'max-w-[36px] max-h-[36px]'
        : 'max-w-[164px] max-h-[164px]'}`
      }
      alt=""
      src={avatarUrl}
    />
  )
}

const PlayerStatus = ({
  nickname
}: PlayerStatusProps) => {
  const nicknameByCookie = null;

  return (
    <Dialog>
      <DialogTrigger className="w-full">
        <div
          title="Перейти к игроку"
          className="flex items-center w-full px-4 py-3 rounded-xl duration-300 hover:bg-neutral-700 bg-neutral-800 justify-start gap-4"
        >
          <PlayerStatusImage type="small" nickname={nickname} />
          <Typography color="white" className="text-xl">
            {nickname}
          </Typography>
          {nicknameByCookie && (
            <Typography color="gray" className="text-lg">
              Это вы
            </Typography>
          )}
        </div>
      </DialogTrigger>
      <DialogContent className="justify-center !max-w-xl">
        <DialogTitle className="text-center">{nickname}</DialogTitle>
        <div className="flex flex-col items-center gap-8 w-full">
          <PlayerStatusImage type="full" nickname={nickname} />
          <div className="flex flex-col gap-2 w-full">
            <Link
              href={`${APP_URL}/player/${nickname}`}
              className="inline-flex items-center justify-center whitespace-nowrap
							px-4 py-2 hover:bg-[#05b458] duration-300 ease-in-out bg-[#088d47] rounded-md w-full"
            >
              <p className="text-white text-lg">
                Перейти к профилю
              </p>
            </Link>
            <DialogClose className="w-full">
              <div
                className="inline-flex items-center justify-center whitespace-nowrap
								px-4 py-2 hover:bg-[#E66A6D] bg-[#C65558] rounded-md w-full"
              >
                <p className="text-white text-lg">
                  Закрыть
                </p>
              </div>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const ServerStatusSkeleton = () => {
  return (
    <div className="flex flex-col gap-6 w-full">
      <Skeleton className="w-full h-10" />
      <div className="flex flex-col gap-2 w-full">
        <Skeleton className="w-full h-12" />
        <Skeleton className="w-full h-12" />
        <Skeleton className="w-full h-12" />
        <Skeleton className="w-full h-12" />
        <Skeleton className="w-full h-12" />
      </div>
    </div>
  )
}

const ServerStatus = reatomComponent(({ ctx }) => {
  const isClient = usePageContext().isClientSide
  
  useUpdate(serverStatusAction, []);

  if (!isClient) {
    return <ServerStatusSkeleton />
  }

  const data = ctx.spy(serverStatusAction.dataAtom)

  if (ctx.spy(serverStatusAction.statusesAtom).isPending) {
    return <ServerStatusSkeleton />
  }

  const isServerOnline = data?.proxy.status === 'online'

  const playersList = data?.proxy.players
  const playersOnline = data?.proxy.online
  const playersMax = data?.proxy.max

  return (
    <>
      {!isServerOnline && (
        <p className="text-xl lg:text-2xl">
          Список игроков недоступен
        </p>
      )}
      {(isServerOnline && playersList) && (
        <>
          <p className="text-xl lg:text-2xl">
            Все игроки: {playersOnline}/{playersMax}
          </p>
          <div className="flex flex-col gap-2 h-full">
            {playersList.length === 0 && (
              <p className="px-2">
                тишина...
              </p>
            )}
            {playersList.map((nickname) =>
              <PlayerStatus key={nickname} nickname={nickname} />
            )}
          </div>
        </>
      )}
    </>
  )
}, "PageServerStatus")

export default function Page() {
  return (
    <MainWrapperPage variant="with_section">
      <div className="full-screen-section min-h-screen flex items-center justify-center py-32">
        <div className="flex h-full flex-col lg:flex-row justify-start overflow-hidden items-start gap-6 responsive">
          <iframe
            src="https://discord.com/widget?id=958086036393689098&theme=dark"
            width="350"
            height="500"
            // @ts-ignore
            allowtransparency={true.toString()}
            className="rounded-[4px]! border-2 border-[#454545] w-full lg:w-1/4"
            sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
          />
          <div className="flex flex-col w-full gap-6 lg:w-3/4 h-full">
            <StatusItem />
            <div
              className="flex flex-col max-h-[496px] overflow-y-scroll gap-6 card-wrapper w-full h-full"
            >
              <ServerStatus />
            </div>
          </div>
        </div>
      </div>
    </MainWrapperPage>
  )
}
