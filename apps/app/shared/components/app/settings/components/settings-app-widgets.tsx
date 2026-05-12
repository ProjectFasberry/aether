import { reatomComponent } from "@reatom/npm-react";
import { Typography } from "@/shared/ui/typography"
import { playerSLPState } from "../../player/models/player-seems-like.model";
import { SettingsContentWrapper } from "./ui";
import { Switch } from "@/shared/ui/switch";

const SeemsLikeVisibility = reatomComponent(({ ctx }) => {
  return (
    <div className="flex items-center justify-between w-full gap-2">
      <div className="flex flex-col gap-1">
        <Typography className="text-lg font-semibold">
          Показывать похожих игроков
        </Typography>
      </div>
      <Switch
        checked={ctx.spy(playerSLPState.settings.isShow)}
        onCheckedChange={value => playerSLPState.settings.isShow.toggle(ctx, value)}
      />
    </div>
  )
}, "SeemsLikeVisibility")

export const SettingsAppWidgets = () => {
  return (
    <SettingsContentWrapper title="Виджеты">
      <div className="flex flex-col gap-8 w-full h-full">
        <SeemsLikeVisibility />
      </div>
    </SettingsContentWrapper>
  )
}