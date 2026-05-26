import { reatomComponent } from "@reatom/npm-react";
import { Button } from "@/shared/ui/button";
import { Typography } from "@/shared/ui/typography"
import { alertDialogState, alertDialog } from "./alert-dialog.model";
import { Dialog } from "@ark-ui/react/dialog";
import { Portal } from "@ark-ui/react/portal"
import { dialogBackdropVariant, dialogBaseStyle, DialogClose, dialogContentVariant, dialogPositionerVariant, dialogTitleVariant } from "@/shared/ui/dialog";

const AlertContent = reatomComponent(({ ctx }) => {
  const opts = ctx.spy(alertDialogState.config);
  if (!opts) return null;

  const { title, withCancel = true, description, confirmLabel } = opts;

  return (
    <div className="w-full">
      <div className="flex flex-col items-center min-w-0 justify-center gap-4 h-full w-full">
        <div className="flex w-full flex-col min-w-0">
          {title && (
            <Typography className="text-wrap text-sm sm:text-base lg:text-lg leading-6 truncate">
              {title}
            </Typography>
          )}
          <Typography className="text-sm sm:text-base leading-6 text-neutral-400">
            {description ?? "Это действие нельзя отменить"}
          </Typography>
        </div>
        <div className="flex items-center min-w-0 justify-end gap-2 w-full h-full">
          {withCancel && (
            <Button
              background="default"
              className="text-xs sm:text-base"
              onClick={() => alertDialog.close(ctx)}
            >
              Отмена
            </Button>
          )}
          <Button
            onClick={() => alertDialog.confirm(ctx)}
            background="white"
            className="text-xs sm:text-base text-nowrap truncate min-w-0"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}, "AlertContent")

export const AlertDialog = reatomComponent(({ ctx }) => {
  const opts = ctx.spy(alertDialogState.config);

  return (
    <Dialog.Root open={ctx.spy(alertDialogState.isOpen)} onOpenChange={v => alertDialogState.isOpen(ctx, v.open)}>
      <Portal>
        <Dialog.Backdrop className={dialogBackdropVariant()} style={dialogBaseStyle} />
        <Dialog.Positioner className={dialogPositionerVariant()} style={dialogBaseStyle} >
          <Dialog.Content className={dialogContentVariant({ className: "w-lg" })} style={dialogBaseStyle} >
            <Dialog.Title className={dialogTitleVariant()}>
              {opts?.dialogTitle ?? "Подтверждение действия"}
            </Dialog.Title>
            <AlertContent />
            <DialogClose />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}, "AlertDialog")
