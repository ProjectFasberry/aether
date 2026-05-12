import { Skeleton } from "@/shared/ui/skeleton";
import { tv } from "tailwind-variants";
import { Avatar } from "../../../../ui/avatar";
import { reatomComponent, useUpdate } from "@reatom/npm-react";
import { createLink, Link } from "@/shared/components/config/link";
import { atom } from "@reatom/framework";
import { pageState } from "@/shared/models/page-context.model";
import { playerSLP, playerSLPState } from "../models/player-seems-like.model";
import { IconX } from "@tabler/icons-react";
import { scrollableVariant } from "@/shared/consts/style-variants";
import { translate } from "@/shared/locales/helpers";
import { Tooltip } from '@ark-ui/react/tooltip'
import { Portal } from '@ark-ui/react/portal'

const playerSeemsLikePlayersCountAtom = atom((ctx) => ctx.spy(playerSLP.fetch.dataAtom)?.meta.count ?? 0)

const PlayerSeemsLikeShowToggle = reatomComponent(({ ctx }) => {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          id="hide-section-seems-like"
          aria-label={translate["player.seems-like-players.notShow"]()}
          onClick={() => playerSLPState.settings.isShow.toggle(ctx)}
          className="cursor-pointer"
        >
          <IconX size={22} className="text-neutral-400" />
        </button>
      </Tooltip.Trigger>
      <Portal>
        <Tooltip.Positioner>
          <Tooltip.Content>
            <span className="text-neutral-400 text-md">
              {translate["player.seems-like-players.notShow"]()}
            </span>
          </Tooltip.Content>
        </Tooltip.Positioner>
      </Portal>
    </Tooltip.Root>
  )
}, "PlayerSeemsLikeShowToggle")

const PlayerSeemsLikePlayersCount = reatomComponent(({ ctx }) => {
  const data = ctx.spy(playerSeemsLikePlayersCountAtom)

  return (
    <div className="w-8 flex items-center justify-center bg-neutral-800 h-8 rounded-full p-0.5">
      <span className="font-semibold text-lg">
        {data}
      </span>
    </div>
  )
}, "PlayerSeemsLikePlayersCount")

export const PlayerSeemsLikePlayers = reatomComponent(({ ctx }) => {
  const isShow = ctx.spy(playerSLPState.settings.isShow);
  if (!isShow) return null;

  return (
    <div className="flex flex-col gap-2 w-full h-full">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <h4 className="text-white font-semibold text-2xl">
            {translate["player.seems-like-players.title"]()}
          </h4>
          <PlayerSeemsLikePlayersCount />
        </div>
        <PlayerSeemsLikeShowToggle />
      </div>
      <PlayerSeemsLikePlayersList />
    </div>
  )
}, "PlayerSeemsLikePlayers")

const seemsLikeGridVariant = tv({
  base: `${scrollableVariant()} grid grid-flow-col auto-cols-max scrollbar-h-2 pb-2 whitespace-nowrap overflow-x-auto gap-2 w-full`,
  slots: {
    card: `flex flex-col rounded-lg bg-neutral-900 overflow-hidden w-fit h-fit`,
    cardAvatar: `w-full h-full rounded-lg overflow-hidden flex items-center justify-center`
  }
})

const PlayerSeemsLikePlayersListSkeleton = () => {
  return (
    <div className={seemsLikeGridVariant().base()}>
      {Array.from({ length: 8 }).map((_, idx) => (
        <div key={idx} className={seemsLikeGridVariant().card()}>
          <Skeleton className={seemsLikeGridVariant().cardAvatar({ className: "min-h-16 min-w-16" })} />
        </div>
      ))}
    </div>
  )
}

const PlayerSeemsLikePlayersList = reatomComponent(({ ctx }) => {
  useUpdate((ctx) => playerSLP.init(ctx), [])

  if (!ctx.spy(pageState.isClientside) || ctx.spy(playerSLP.fetch.statusesAtom).isPending) {
    return <PlayerSeemsLikePlayersListSkeleton />
  }

  const data = ctx.spy(playerSLP.fetch.dataAtom)?.data;
  if (!data) return null;

  return (
    <div className={seemsLikeGridVariant().base()}>
      {data.map((player) => (
        <div key={player.uuid} className={seemsLikeGridVariant().card()}>
          <Link
            href={createLink("player", player.nickname)}
            aria-label={player.nickname}
            className={seemsLikeGridVariant().cardAvatar()}
          >
            <Avatar url={player.avatar} nickname={player.nickname} className="w-16 h-16" />
          </Link>
        </div>
      ))}
    </div>
  )
}, "PlayerSeemsLikePlayersList")