import { reatomComponent } from "@reatom/npm-react";
import { Input } from "@/shared/ui/input";
import { changeGlobalRecipient, changeGlobalRecipientState, changeGlobalRecipientIsValidAtom } from "../models/settings-store.model";
import { Button } from "@/shared/ui/button";
import { SettingsContentWrapper, SettingsSection } from "./ui";
import { IconX } from "@tabler/icons-react";
import { currentUserState } from "@/shared/models/current-user/index.model";

const GlobalRecipient = reatomComponent(({ ctx }) => {
  const oldRecipient = ctx.spy(changeGlobalRecipientState.oldRecipient) ?? ""
  const newRecipient = ctx.spy(changeGlobalRecipientState.newRecipient)
  const error = ctx.spy(changeGlobalRecipientState.error)

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    changeGlobalRecipient.submit(ctx)
  }

  return (
    <SettingsSection
      title="Текущий получатель"
      description="Получатель, который присваивается всем добавленным товарам в корзину."
    >
      <form onSubmit={handle} className="flex items-start w-full min-w-0 justify-between gap-2">
        <div className="flex flex-col flex-1 gap-1 w-[70%]">
          <Input
            value={newRecipient ?? oldRecipient}
            placeholder="Введите никнейм"
            onChange={e => changeGlobalRecipientState.newRecipient(ctx, e.target.value)}
            maxLength={32}
            variant={error ? "danger" : "default"}
            onClick={() => changeGlobalRecipientState.error.reset(ctx)}
            className="w-full h-10 bg-neutral-700"
          />
          {error && <span className="text-red text-sm">{error}</span>}
        </div>
        <div className="flex gap-1 items-center">
          {ctx.spy(currentUserState)?.nickname !== oldRecipient && (
            <Button
              type="button"
              className="h-10 w-10 p-0 font-semibold aspect-square"
              background="white"
              disabled={ctx.spy(changeGlobalRecipient.submit.statusesAtom).isPending}
              onClick={() => changeGlobalRecipient.resetToDefault(ctx)}
            >
              <IconX size={18} />
            </Button>
          )}
          <Button
            type="submit"
            className="h-10 text-sm font-semibold"
            background="white"
            withSpinner
            isLoading={ctx.spy(changeGlobalRecipient.submit.statusesAtom).isPending}
            disabled={!ctx.spy(changeGlobalRecipientIsValidAtom) || ctx.spy(changeGlobalRecipient.submit.statusesAtom).isPending}
          >
            Сохранить
          </Button>
        </div>
      </form>
    </SettingsSection>
  )
}, "GlobalRecipient")

export const SettingsStore = () => {
  return (
    <SettingsContentWrapper title="Магазин">
      <GlobalRecipient />
    </SettingsContentWrapper>
  )
}