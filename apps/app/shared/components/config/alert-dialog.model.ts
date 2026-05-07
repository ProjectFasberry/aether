import { DIALOG_DELAY } from "@/shared/consts/index"
import { action, Action, atom } from "@reatom/framework"
import { sleep, withAssign, withReset } from "@reatom/framework"

type AlertDialogConfig = {
  title: string
  description?: string
  confirmAction: Action
  confirmLabel: string
  cancelAction?: Action
  autoClose?: boolean,
  withDelay?: boolean
}

export const alertDialogIsOpenAtom = atom(false, "alertDialogIsOpen").pipe(withReset())
export const alertDialogConfigAtom = atom<AlertDialogConfig | null>(null, "alertDialogConfig").pipe(withReset())

export const alertDialog = atom(null).pipe(
  withAssign((ctx, name) => ({
    open: action(async (ctx, { withDelay = true, ...config }: AlertDialogConfig) => {
      alertDialogConfigAtom(ctx, { withDelay, ...config });
      
      if (withDelay) {
        await ctx.schedule(() => sleep(DIALOG_DELAY))
      }

      alertDialogIsOpenAtom(ctx, true);
    }, `${name}.open`),
    confirm: action(async (ctx) => {
      const config = ctx.get(alertDialogConfigAtom)
      console.log(config);
      if (!config) return

      config.confirmAction(ctx)

      if (config.autoClose) {
        await ctx.schedule(() => sleep(DIALOG_DELAY))
        alertDialog.close(ctx)
      }
    }),
    cancel: action(async (ctx) => {
      const config = ctx.get(alertDialogConfigAtom)

      if (config?.cancelAction) {
        config.cancelAction(ctx)
      }

      await ctx.schedule(() => sleep(DIALOG_DELAY))
      alertDialogConfigAtom.reset(ctx)
      alertDialogIsOpenAtom(ctx, false)
    }),
    close: action(async (ctx) => {
      await ctx.schedule(() => sleep(DIALOG_DELAY))
      alertDialogConfigAtom.reset(ctx)
      alertDialogIsOpenAtom(ctx, false)
    }),
  }))
)