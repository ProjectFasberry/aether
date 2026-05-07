import { reatomComponent } from "@reatom/npm-react";
import { Input } from "@repo/ui/input";
import { changeRecipient, changeRecipientState, changeGlobalRecipientIsValidAtom } from "../../shop/models/store-recipient.model";
import { Button } from "@repo/ui/button";
import { atom } from "@reatom/framework";
import { SettingsContentWrapper, SettingsSection } from "./ui";
import { IconDeviceFloppy } from "@tabler/icons-react";

const isDisabledAtom = atom((ctx) =>
  !ctx.spy(changeGlobalRecipientIsValidAtom) || 
  ctx.spy(changeRecipient.submitGlobal.statusesAtom).isPending,
)

const GlobalRecipient = reatomComponent(({ ctx }) => {
  const oldRecipient = ctx.get(changeRecipientState.global.oldRecipient) ?? ""
  const newRecipient = ctx.spy(changeRecipientState.global.newRecipient)

  const error = ctx.spy(changeRecipientState.global.error)

  return (
    <SettingsSection
      title="Текущий получатель"
      description="Получатель, который присваивается всем добавленным товарам в корзину."
      component={
        <div className="flex items-center w-full min-w-0 justify-between gap-2">
          <Input
            value={newRecipient ?? oldRecipient}
            placeholder="Введите никнейм"
            onChange={e => changeRecipientState.global.newRecipient(ctx, e.target.value)}
            maxLength={32}
            onClick={() => changeRecipientState.global.error.reset(ctx)}
            aria-invalid={!!error}
            className="flex-1 w-[70%] h-10 bg-neutral-700"
          />
          <Button
            onClick={() => changeRecipient.submitGlobal(ctx)}
            className="p-0! aspect-square h-10 font-semibold"
            background="white"
            disabled={ctx.spy(isDisabledAtom)}
          >
            <IconDeviceFloppy />
          </Button>
          {error && (
            <span className="text-red text-sm">{error}</span>
          )}
        </div>
      }
    />
  )
}, "GlobalRecipient")

export const SettingsStore = () => {
  return (
    <SettingsContentWrapper title="Магазин">
      <GlobalRecipient />
    </SettingsContentWrapper>
  )
}