import { reatomComponent } from "@reatom/npm-react";
import { Typography } from "@/shared/ui/typography"
import { playerSLPState } from "../../player/models/player-seems-like.model";
import { SettingsContentWrapper } from "./ui";
import { Switch } from "@/shared/ui/switch";
import { translate } from "@/shared/locales/helpers";
import { balanceState } from "../../player/models/balance.model";

const BalanceSettings = reatomComponent(({ ctx }) => {
  return (
    <div className="flex items-center justify-between w-full gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor="balance-animate:control:input" className="text-lg leading-5 font-semibold">
          {translate["player.balance.settings.variants.animation"]()}
        </label>
        <Typography color="gray" className="text-sm">
          Цифры будут изменяться плавно при пополнении или списании счета.
        </Typography>
      </div>
      <Switch
        id="balance-animate"
        checked={ctx.spy(balanceState.settings.animateBalance)}
        onCheckedChange={({ checked }) => balanceState.settings.animateBalance(ctx, checked)}
      />
    </div>
  )
}, "BalanceSettings")

const SeemsLikeVisibility = reatomComponent(({ ctx }) => {
  return (
    <div className="flex items-center justify-between w-full gap-2">
      <div className="flex flex-col gap-1">
        <Typography className="text-lg leading-5 font-semibold">
          Показывать похожих игроков
        </Typography>
        <Typography color="gray" className="text-sm">
          Показывать блок похожих профилей под основной информацией.
        </Typography>
      </div>
      <Switch
        checked={ctx.spy(playerSLPState.settings.isShow)}
        onCheckedChange={({ checked }) => playerSLPState.settings.isShow.toggle(ctx, checked)}
      />
    </div>
  )
}, "SeemsLikeVisibility")

export const SettingsAppearance = () => {
  return (
    <SettingsContentWrapper title="Персонализация">
      <div className="flex flex-col gap-8 w-full h-full">
        <SeemsLikeVisibility />
        <BalanceSettings />
      </div>
    </SettingsContentWrapper>
  )
}
