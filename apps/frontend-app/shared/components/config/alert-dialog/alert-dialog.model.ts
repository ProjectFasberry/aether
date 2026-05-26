import { DIALOG_DELAY } from "@/shared/consts/index"
import { action, type Action, atom } from "@reatom/framework"
import { sleep, withAssign, withReset } from "@reatom/framework"

type AlertDialogConfig = {
  title?: string,
  dialogTitle?: string,
  description?: string
  confirmAction?: Action
  confirmLabel: string
  autoClose?: boolean,
  withDelay?: boolean
} & (
    | {
      withCancel?: true,
      cancelAction?: Action
    }
    | {
      withCancel?: false,
      cancelAction?: never
    }
  )

export const alertDialogState = atom(null, "alertDialogState").pipe(
  withAssign((_, name) => ({
    isOpen: atom(false, `${name}.isOpen`).pipe(withReset()),
    config: atom<AlertDialogConfig | null>(null, `${name}.config`).pipe(withReset())
  }))
)
export const alertDialog = atom(null, "alertDialog").pipe(
  withAssign((_, name) => ({
    open: action(async (ctx, { withDelay = false, ...config }: AlertDialogConfig) => {
      alertDialogState.config(ctx, { withDelay, ...config });

      if (withDelay) {
        await ctx.schedule(() => sleep(DIALOG_DELAY))
      }

      alertDialogState.isOpen(ctx, true);
    }, `${name}.open`),
    confirm: action(async (ctx) => {
      const config = ctx.get(alertDialogState.config)
      if (!config) return

      config.confirmAction?.(ctx)

      if (config.autoClose) {
        if (config.withDelay) {
          await ctx.schedule(() => sleep(DIALOG_DELAY))
        }
      }

      alertDialog.close(ctx)
    }, `${name}.confirm`),
    cancel: action(async (ctx) => {
      const config = ctx.get(alertDialogState.config)

      if (config?.cancelAction) {
        config.cancelAction(ctx)
      }

      await ctx.schedule(() => sleep(DIALOG_DELAY))

      alertDialogState.config.reset(ctx)
      alertDialogState.isOpen(ctx, false)
    }, `${name}.cancel`),
    close: action((ctx) => {
      alertDialogState.isOpen(ctx, false)
    }, `${name}.close`),
  }))
)

alertDialogState.isOpen.onChange(async (ctx, state) => {
  if (!state) {
    const config = ctx.get(alertDialogState.config)

    if (config?.withDelay) {
      await ctx.schedule(() => sleep(DIALOG_DELAY))
    }

    alertDialogState.config.reset(ctx)
  }
})
