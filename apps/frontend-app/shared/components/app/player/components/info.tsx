import { reatomComponent } from "@reatom/npm-react";
import { Rate } from "./rate";
import { playerState } from "../models/player.model";
import { DONATE_COLORS, DONATE_TITLE } from "@/shared/consts";

type Player = ExtractApiData<"getServerPlayerByNickname">["data"]

const PlayerTag = ({ group }: { group: Player["group"] }) => {
  return (
    <div
      style={{ borderColor: DONATE_COLORS[group as keyof typeof DONATE_COLORS] }}
      className="flex px-3 items-center justify-center gap-2 py-0.5 rounded-full border"
    >
      <span
        style={{ backgroundColor: DONATE_COLORS[group as keyof typeof DONATE_COLORS] }}
        className="h-3 w-3 rounded-full"
      />
      <span>{DONATE_TITLE[group as keyof typeof DONATE_COLORS]}</span>
    </div>
  )
}
const PlayerTags = reatomComponent(({ctx}) => {
  const data = ctx.spy(playerState.tags)

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {data.map((tag) => <PlayerTag key={tag} group={tag} />)}
    </div>
  )
}, "PlayerTags")

export const PlayerInfo = reatomComponent(({ ctx }) => {
  const nickname = ctx.spy(playerState.nickname)
  const rate = ctx.spy(playerState.rate)
  if (!rate || !nickname) return null;

  return (
    <div className="flex justify-between h-full items-center w-full">
      <div className='flex flex-col gap-2'>
        <h1 className="text-4xl font-bold">{nickname}</h1>
        <PlayerTags/>
      </div>
      <div className="flex items-center justify-center w-min">
        <Rate isRated={rate.isRated} nickname={nickname} count={rate.count} />
      </div>
    </div>
  )
}, "PlayerInfo")
