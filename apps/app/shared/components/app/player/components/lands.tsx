import { reatomComponent } from "@reatom/npm-react"
import { Skeleton } from "@repo/ui/skeleton"
import { Typography } from "@repo/ui/typography"
import { Land } from "@repo/shared/types/entities/land"
import { createLink, Link } from "../../../config/link"
import { playerLandsAction, playerLandsAtom } from "../models/player-lands.model"
import { atom } from "@reatom/core"

const PlayerLand = ({ ulid, title, details, name, members, chunks_amount }: Land) => {
  return (
    <Link
      href={createLink("land", ulid)}
      className="flex p-2 lg:p-4 border 
        hover:bg-neutral-800 duration-300 ease-in-out border-neutral-600 cursor-pointer rounded-xl"
    >
      <div className="flex items-center gap-3 w-full lg:w-3/4">
        {details?.banner ? (
          <img src={details?.banner} draggable={false} className="w-12 h-full" alt="" />
        ) : (
          <div className="h-full w-10 bg-neutral-50 rounded-lg" />
        )}
        <div className="flex flex-col gap-1">
          <Typography className="text-lg leading-6 font-semibold">
            {name}
          </Typography>
          <div className="flex flex-col gap-1">
            <span className="text-base text-neutral-400">
              {members.length} {members.length > 1 ? "участника" : "участник"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

const PlayerLandsList = reatomComponent(({ ctx }) => {
  const data = ctx.spy(playerLandsAtom)?.data

  if (ctx.spy(playerLandsAction.statusesAtom).isPending) {
    return <Skeleton className="h-24 w-full" />
  }

  if (!data) {
    return <Typography color="gray" className="text-lg">нет</Typography>
  }

  // @ts-expect-error
  return data.map(land => <PlayerLand key={land.ulid} {...land} />)
}, "PlayerLandsList")

const playerLandsCountAtom = atom(
  (ctx) => ctx.spy(playerLandsAtom)?.meta.count ?? 0, 
  "playerLandsCount"
)

const PlayerLandsCount = reatomComponent(({ ctx }) => {
  const data = ctx.spy(playerLandsCountAtom)

  return (
    <div className="w-6 flex items-center justify-center bg-neutral-800 h-6 rounded-full">
      <span className="font-semibold text-sm">
        {data}
      </span>
    </div>
  )
}, "PlayerLandsCount")

export const PlayerLands = () => {
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center gap-1">
        <h3 className="text-white font-semibold text-2xl">Территории</h3>
        <PlayerLandsCount />
      </div>
      <PlayerLandsList />
    </div>
  )
}