import { reatomComponent } from "@reatom/npm-react"
import { Skeleton } from "@/shared/ui/skeleton"
import { Typography } from "@/shared/ui/typography"
import { createLink, Link } from "../../../config/link"
import { playerLands, playerLandsState } from "../models/player-lands.model"
import { atom } from "@reatom/framework"
import { translate } from "@/shared/locales/helpers"

type Land = ExtractApiData<"getServerLandsListByNickname">["data"]["data"][number]

const PlayerLand = ({ ulid, title, details, name, members }: Land) => {
  return (
    <Link
      href={createLink("land", ulid)}
      className="flex p-2 lg:p-4 duration-300 ease-in-out bg-neutral-900 cursor-pointer rounded-xl"
    >
      <div className="flex items-center gap-3 w-full lg:w-3/4">
        {details?.banner ? (
          <img src={details?.banner} draggable={false} className="rounded-lg object-cover h-14 w-12" alt="" />
        ) : (
          <div className="h-full w-10 bg-neutral-50 rounded-lg" />
        )}
        <div className="flex flex-col gap-1">
          <Typography className="text-lg leading-5 font-semibold">
            {name}
          </Typography>
          <div className="flex flex-col gap-1">
            <span className="text-base leading-4 text-neutral-400">
              {members.length} {translate["shared.lands.single.attributes.members"]()}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

const PlayerLandsList = reatomComponent(({ ctx }) => {
  if (ctx.spy(playerLands.fetch.statusesAtom).isPending) return <Skeleton className="h-24 w-full" />

  const data = ctx.spy(playerLandsState.data)?.data

  if (!data) {
    return <Typography color="gray" className="text-lg">нет</Typography>
  }

  return data.map(land => <PlayerLand key={land.ulid} {...land} />)
}, "PlayerLandsList")

const playerLandsCountAtom = atom((ctx) => ctx.spy(playerLandsState.data)?.meta.count ?? 0)

const PlayerLandsCount = reatomComponent(({ ctx }) => {
  if (ctx.spy(playerLands.fetch.statusesAtom).isPending) return <Skeleton className="h-8 aspect-square" />
  
  const data = ctx.spy(playerLandsCountAtom)

  return (
    <div className="flex items-center justify-center bg-neutral-800 aspect-square h-8 rounded-lg">
      <span className="font-semibold text-base">{data}</span>
    </div>
  )
}, "PlayerLandsCount")

export const PlayerLands = () => {
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-end gap-2">
        <h3 className="text-white font-semibold text-2xl">{translate["player.lands.title"]()}</h3>
        <PlayerLandsCount />
      </div>
      <PlayerLandsList />
    </div>
  )
}