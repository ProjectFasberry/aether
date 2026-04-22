import { reatomComponent } from "@reatom/npm-react";
import { Button } from "@repo/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@repo/ui/dialog";
import { Typography } from "@repo/ui/typography";
import { alertDialogIsOpenAtom, alertDialogConfigAtom, alertDialog } from "./alert-dialog.model";

export const AlertDialog = reatomComponent(({ ctx }) => {
  const opts = ctx.spy(alertDialogConfigAtom);
  if (!opts) return null;

  const { title, confirmAction, confirmLabel, description } = opts

  return (
    <Dialog open={ctx.spy(alertDialogIsOpenAtom)} onOpenChange={v => alertDialogIsOpenAtom(ctx, v)}>
      <DialogContent className="w-lg">
        <DialogTitle>
          Подтверждение действия
        </DialogTitle>
        <div className="flex flex-col items-center min-w-0 justify-center gap-4 h-full w-full">
          <div className="flex w-full flex-col min-w-0">
            <Typography className="text-wrap text-sm sm:text-base lg:text-lg leading-5 truncate">
              {title}
            </Typography>
            <Typography className="text-sm sm:text-base leading-5 text-neutral-400">
              {description ?? "Это действие нельзя отменить"}
            </Typography>
          </div>
          <div className="flex items-center min-w-0 justify-end gap-2 w-full h-full">
            <DialogClose asChild>
              <Button
                background="default"
                className="text-xs sm:text-base"
                onClick={() => alertDialog.close(ctx)}
              >
                Отмена
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button
                onClick={() => confirmAction(ctx)}
                background="white"
                className="text-xs sm:text-base text-nowrap truncate min-w-0"
              >
                {confirmLabel}
              </Button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}, "AlertDialog")