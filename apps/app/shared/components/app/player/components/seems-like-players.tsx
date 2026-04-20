import { Skeleton } from "@repo/ui/skeleton";
import { tv } from "tailwind-variants";
import { Avatar } from "../../avatar/components/avatar";
import { reatomComponent } from "@reatom/npm-react";
import { createLink, Link } from "@/shared/components/config/link";
import { atom, onConnect } from "@reatom/framework";
import { isClientAtom } from "@/shared/models/page-context.model";
import { playerSLP, playerSLPState } from "../models/player-seems-like.model";
import { IconX } from "@tabler/icons-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@repo/ui/tooltip"
import { scrollableVariant } from "@/shared/consts/style-variants";

const playerSeemsLikePlayersCountAtom = atom((ctx) => 
  ctx.spy(playerSLP.fetch.dataAtom)?.meta.count ?? 0, 
  "playerLandsCount"
)

const PlayerSeemsLikeShowToggle = reatomComponent(({ ctx }) => {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={1}>
        <TooltipTrigger
          id="hide-section-seems-like"
          aria-label="Не показывать секцию"
          onClick={() => playerSLPState.settings.isShow.toggle(ctx)}
          className="cursor-pointer"
        >
          <IconX size={22} className="text-neutral-400" />
        </TooltipTrigger>
        <TooltipContent>
          <span className="text-neutral-400 text-md">
            Не показывать
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}, "PlayerSeemsLikeShowToggle")

onConnect(playerSLP.fetch.dataAtom, playerSLP.fetch)

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
          <h4 className="text-white font-semibold text-2xl">Похожие игроки</h4>
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
    card: `flex flex-col rounded-lg bg-neutral-800 overflow-hidden w-fit h-fit`,
    cardAvatar: `w-full h-full rounded-lg overflow-hidden flex items-center justify-center`
  }
})

const PlayerSeemsLikePlayersListSkeleton = () => {
  return (
    <div className={seemsLikeGridVariant().base()}>
      {Array.from({ length: 6 }).map((item, idx) => (
        <div
          key={idx}
          className={seemsLikeGridVariant().card()}
        >
          <Skeleton
            className={seemsLikeGridVariant().cardAvatar({ className: "min-h-16 min-w-16" })}
          />
        </div>
      ))}
    </div>
  )
}

const PlayerSeemsLikePlayersList = reatomComponent(({ ctx }) => {
  if (!ctx.spy(isClientAtom)) {
    return <PlayerSeemsLikePlayersListSkeleton />
  }

  const data = ctx.spy(playerSLP.fetch.dataAtom)?.data;

  if (ctx.spy(playerSLP.fetch.statusesAtom).isPending) {
    return <PlayerSeemsLikePlayersListSkeleton />
  }

  if (!data) return null;

  return (
    <div className={seemsLikeGridVariant().base()}>
      {data.map(({ nickname, uuid }) => (
        <div
          key={uuid}
          className={seemsLikeGridVariant().card()}
        >
          <Link
            href={createLink("player", nickname)}
            aria-label={`Профиль игрока ${nickname}`}
            className={seemsLikeGridVariant().cardAvatar()}
          >
            <Avatar nickname={nickname} propWidth={64} propHeight={64} />
          </Link>
        </div>
      ))}
    </div>
  )
}, "PlayerSeemsLikePlayersList")