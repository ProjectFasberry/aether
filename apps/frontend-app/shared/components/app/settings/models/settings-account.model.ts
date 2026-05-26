import { alertDialog } from "@/shared/components/config/alert-dialog/alert-dialog.model"
import { client } from "@/shared/lib/client-wrapper"
import { action, atom, reatomAsync, withAssign, withErrorAtom, withReset, withStatusesAtom } from "@reatom/framework"
import { settings, } from "./settings.model"
import { toast } from "sonner"
import { isError } from "@/shared/lib/helpers"

export const settingsAccountModel = () => {
  const deleteAccount = atom(null, "deleteAccount").pipe(
    withAssign((_, name) => ({
      before: action((ctx) => {
        alertDialog.open(ctx, {
          title: "Удаление аккаунта",
          confirmLabel: "Подтвердить",
          description: "Удаление аккаунта безвозвратное, все игровые данные будут удалены",
          confirmAction: deleteAccount.submit,
          autoClose: true
        })
      }, `${name}.before`),
      submit: reatomAsync(async (ctx) => {
        return await client
          .delete<ExtractApiData<"deleteAccount">["data"]>("account/")
          .exec()
      }, {
        name: `${name}.submit`,
        onFulfill: (ctx, res) => {
          if (res === 'OK') {
            settings.close(ctx);
            ctx.schedule(() => window.location.reload())
          }
        },
        onReject: (_, e) => {
          if (isError(e)) {
            toast.error(e.message)
          }
        }
      }).pipe(
        withStatusesAtom()
      )
    }))
  )

  const changePassState = atom(null, "changePassState").pipe(
    withAssign((_, name) => ({
      isOpen: atom(false, `${name}.isOpen`),
      currentPass: atom("", `${name}.currentPass`).pipe(withReset()),
      newPass: atom("", `${name}.newPass`).pipe(withReset()),
      newPassRepeat: atom("", `${name}.newPassRepeat`).pipe(withReset())
    }))
  )

  changePassState.isOpen.onChange((ctx, state) => {
    if (!state) {
      changePassState.currentPass.reset(ctx)
      changePassState.newPass.reset(ctx)
      changePassState.newPassRepeat.reset(ctx)
      changePass.submit.errorAtom.reset(ctx)
    }
  })

  const changePass = atom(null, "changePass").pipe(
    withAssign((_, name) => ({
      before: action((ctx) => {
        changePassState.isOpen(ctx, true)
      }, `${name}.before`),
      submit: reatomAsync(async (ctx, json: { currentPass: string, newPass: string }) => {
        changePass.submit.errorAtom.reset(ctx);

        return await client
          .patch<ExtractApiData<"patchAccountPassword">["data"]>("account/password", {
            json
          })
          .exec()
      }, {
        name: `${name}.submit`,
        onFulfill: (ctx, res) => {
          if (res === "OK") {
            changePassState.isOpen(ctx, false)
            toast.success("Пароль изменен")
          }
        },
        onReject: (_, e) => {
          if (isError(e)) {
            toast.error(e.message)
          }
        }
      }).pipe(
        withStatusesAtom(),
        withErrorAtom()
      ),
      handle: action((ctx, e: React.FormEvent) => {
        e.preventDefault()

        const currentPass = ctx.get(changePassState.currentPass);
        const newPass = ctx.get(changePassState.newPass);

        const json = {
          currentPass,
          newPass
        }

        const repeatPass = ctx.get(changePassState.newPassRepeat);

        if (currentPass === newPass) {
          changePass.submit.errorAtom(ctx, new Error("Новый пароль должен отличаться"))
          return;
        }

        if (newPass !== repeatPass) {
          changePass.submit.errorAtom(ctx, new Error("Пароли не совпадают"))
          return;
        }

        changePass.submit(ctx, json)
      }, `${name}.before`)
    }))
  )

  return {
    deleteAccount,
    changePass,
    changePassState
  }
}
