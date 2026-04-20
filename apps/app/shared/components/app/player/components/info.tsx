import { reatomComponent } from "@reatom/npm-react";
import { Rate } from "./rate";
import { playerAtom, playerParamAtom } from "../models/player.model";
import { DONATE_COLORS, DONATE_TITLE } from "@repo/shared/constants/donate-aliases";
import { Player } from "@repo/shared/types/entities/user";
import { atom } from "@reatom/core";
import { playerRateState } from "../models/rate.model";

const PlayerTag = ({ group }: { group: Player["group"] }) => {
  return (
    <div
      style={{ borderColor: DONATE_COLORS[group] }}
      className="flex px-3 items-center justify-center gap-2 py-0.5 rounded-full border"
    >
      <span
        style={{ backgroundColor: DONATE_COLORS[group] }}
        className="h-3 w-3 rounded-full"
      />
      <span>{DONATE_TITLE[group]}</span>
    </div>
  )
}

const playerTagsAtom = atom<Player["group"][]>((ctx) => {
  const player = ctx.spy(playerAtom)
  if (!player) return [];

  if (player.group !== 'default') {
    return [player.group, "default"] as Player["group"][]
  }

  return [player.group] as Player["group"][]
}, "playerTags")

const PlayerRate = reatomComponent(({ ctx }) => {
  const nickname = ctx.spy(playerParamAtom);
  const rateData = ctx.spy(playerRateState.data);

  if (!rateData || !nickname) return null;

  return (
    <Rate isRated={rateData.isRated} nickname={nickname} count={rateData.count} />
  )
}, "PlayerRate")

export const PlayerInfo = reatomComponent(({ ctx }) => {
  const nickname = ctx.spy(playerParamAtom);
  if (!nickname) return null;

  const tags = ctx.spy(playerTagsAtom)

  return (
    <div className="flex justify-between h-full items-center w-full">
      <div className='flex flex-col gap-2'>
        <h1 className="text-4xl font-bold">{nickname}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {tags.map((tag) => <PlayerTag key={tag} group={tag} />)}
        </div>
      </div>
      <div className="flex items-center justify-center w-min">
        <PlayerRate />
      </div>
    </div>
  )
}, "PlayerInfo")