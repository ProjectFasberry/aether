import { reatomComponent } from "@reatom/npm-react"
import {
  changeRecipientAction,
  changeRecipientDialogIsOpenAtom,
  changeRecipientErrorAtom,
  changeRecipientIdAtom,
  changeRecipientIsValidAtom,
  changeRecipientNewRecipientAtom,
  changeRecipientOldRecipientAtom,
  changeRecipientTitleAtom
} from "../../models/store-recipient.model"
import { Dialog, DialogContent, DialogTitle } from "@repo/ui/dialog"
import { Typography } from "@repo/ui/typography"
import { Input } from "@repo/ui/input"
import { Button } from "@repo/ui/button"
import { cart } from "../../models/store-cart.model"

const ChangeRecipientError = reatomComponent(({ ctx }) => {
  const error = ctx.spy(changeRecipientErrorAtom);
  if (!error) return null;

  return (
    <span className="text-red text-sm">{error}</span>
  )
}, "ChangeRecipientError")

const ChangeRecipientField = reatomComponent(({ ctx }) => {
  const oldRecipient = ctx.get(changeRecipientOldRecipientAtom) ?? ""
  const newRecipient = ctx.spy(changeRecipientNewRecipientAtom)

  return (
    <Input
      placeholder="Введите никнейм"
      maxLength={32}
      value={newRecipient ?? oldRecipient}
      onChange={e => changeRecipientNewRecipientAtom(ctx, e.target.value)}
      className="[&[aria-invalid=true]]:border-red peer border-transparent border-2"
      onClick={() => {
        changeRecipientErrorAtom.reset(ctx)
      }}
      aria-invalid={!!ctx.spy(changeRecipientErrorAtom)}
    />
  )
}, "ChangeRecipientField")

const ChangeRecipientSave = reatomComponent<{ id: number }>(({ ctx, id }) => {
  const isDisabled = !ctx.spy(changeRecipientIsValidAtom) || ctx.spy(changeRecipientAction.statusesAtom).isPending

  return (
    <Button
      background="white"
      className="px-4 w-fit self-end font-semibold"
      disabled={isDisabled}
      onClick={() => changeRecipientAction(ctx, id, cart.update)}
    >
      Применить
    </Button>
  )
}, "ChangeRecipientSave")

export const ChangeRecipientDialog = reatomComponent(({ ctx }) => {
  const id = ctx.get(changeRecipientIdAtom)!
  const title = ctx.get(changeRecipientTitleAtom)!

  return (
    <Dialog
      open={ctx.spy(changeRecipientDialogIsOpenAtom)}
      onOpenChange={v => changeRecipientDialogIsOpenAtom(ctx, v)}
    >
      <DialogContent>
        <DialogTitle className="text-center text-2xl">Получатель</DialogTitle>
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
      </DialogContent>
    </Dialog>
  )
}, "ChangeRecipient")