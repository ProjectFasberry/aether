import { reatomComponent } from "@reatom/npm-react"
import { changeRecipientIsValidAtom, changeRecipient, changeRecipientState } from "../../models/store-recipient.model"
import { Typography } from "@/shared/ui/typography"
import { Input } from "@/shared/ui/input"
import { Button } from "@/shared/ui/button"
import { cart } from "../../models/store-cart.model"
import { Dialog } from "@ark-ui/react/dialog"
import { Portal } from "@ark-ui/react/portal"
import { dialogBackdropVariant, dialogContentVariant, dialogPositionerVariant } from "@/shared/ui/dialog"

const ChangeRecipientError = reatomComponent(({ ctx }) => {
  const error = ctx.spy(changeRecipientState.local.error);
  if (!error) return null;

  return (
    <span className="text-red text-sm">{error}</span>
  )
}, "ChangeRecipientError")

const ChangeRecipientField = reatomComponent(({ ctx }) => {
  const oldRecipient = ctx.get(changeRecipientState.local.oldRecipient) ?? ""
  const newRecipient = ctx.spy(changeRecipientState.local.newRecipient)

  return (
    <Input
      placeholder="Введите никнейм"
      maxLength={32}
      value={newRecipient ?? oldRecipient}
      onChange={e => changeRecipientState.local.newRecipient(ctx, e.target.value)}
      className="[&[aria-invalid=true]]:border-red peer border-transparent border-2"
      onClick={() => {
        changeRecipientState.local.error.reset(ctx)
      }}
      aria-invalid={!!ctx.spy(changeRecipientState.local.error)}
    />
  )
}, "ChangeRecipientField")

const ChangeRecipientSave = reatomComponent<{ id: number }>(({ ctx, id }) => {
  const isDisabled = !ctx.spy(changeRecipientIsValidAtom) || ctx.spy(changeRecipient.submitLocal.statusesAtom).isPending

  return (
    <Button
      background="white"
      className="px-4 w-fit self-end font-semibold"
      disabled={isDisabled}
      onClick={() => changeRecipient.submitLocal(ctx, id, cart.update)}
    >
      Применить
    </Button>
  )
}, "ChangeRecipientSave")

export const ChangeRecipientDialog = reatomComponent(({ ctx }) => {
  const id = ctx.get(changeRecipientState.local.recipientId)!
  const title = ctx.get(changeRecipientState.local.title)!

  return (
    <Dialog.Root
      open={ctx.spy(changeRecipientState.local.dialogIsOpen)}
      onOpenChange={v => changeRecipientState.local.dialogIsOpen(ctx, v.open)}
    >
      <Portal>
        <Dialog.Backdrop className={dialogBackdropVariant()} />
        <Dialog.Positioner className={dialogPositionerVariant()}>
          <Dialog.Content className={dialogContentVariant()}>
            <Dialog.Title className="text-center text-2xl">Получатель</Dialog.Title>
            <div className="flex flex-col gap-4 w-full h-full">
              <div className="flex flex-col w-full">
                <Typography className="text-xl font-semibold leading-tight">
                  Получатель товара <span className="italic text-neutral-300">{title}</span>
                </Typography>
                <Typography className="leading-tight">
                  Для некоторых товаров доступен выбор получателя.
                  Если получатель не выбран, то товар будет приобретен для вас
                </Typography>
              </div>
              <div className="flex items-center w-full gap-2">
                <div className="flex flex-col w-full">
                  <Typography>
                    Текущий получатель
                  </Typography>
                  <ChangeRecipientField />
                </div>
              </div>
              <div className="flex gap-1 flex-col sm:flex-row w-full items-center justify-between">
                <div className="flex">
                  <ChangeRecipientError />
                </div>
                <ChangeRecipientSave id={id} />
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}, "ChangeRecipient")