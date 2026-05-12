import { reatomComponent } from "@reatom/npm-react"
import { Button } from "@/shared/ui/button"
import { Typography } from "@/shared/ui/typography"
import { type SettingsSectionItem } from "../models/settings.model"
import { SettingsContentWrapper, SettingsSection } from "./ui"
import { Dialog, DialogPositioner } from "@ark-ui/react/dialog"
import { Portal } from "@ark-ui/react/portal"
import { dialogBackdropVariant, dialogContentVariant, dialogPositionerVariant } from "@/shared/ui/dialog"

const SettingsMainDeleteAccount = reatomComponent(({ ctx }) => {
  return (
    <>
      <Button
        disabled={true}
        className="w-fit self-start bg-red/80"
        onClick={() => { }}
      >
        <Typography className="leading-5 font-semibold">
          Удалить аккаунт
        </Typography>
      </Button>
    </>
  )
}, "DeleteAccount")

const SettingsMainChangePassword = reatomComponent(({ ctx }) => {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button background="white" disabled={true} className="w-fit">
          <Typography className="leading-5 font-semibold">
            Изменить пароль
          </Typography>
        </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop className={dialogBackdropVariant()} />
        <DialogPositioner className={dialogPositionerVariant()}>
          <Dialog.Content className={dialogContentVariant()}>
            <Dialog.Title className="text-center text-xl">Изменение пароля</Dialog.Title>
            <Typography>
            </Typography>
          </Dialog.Content>
        </DialogPositioner>
      </Portal>
    </Dialog.Root>
  )
}, "ChangePassword")

const ACCOUNT_SECTIONS: SettingsSectionItem[] = [
  {
    title: "Пароль и аутенфикация",
    description: "Изменение пароля от аккаунта",
    component: <SettingsMainChangePassword />
  },
  {
    title: "Удаление аккаунта",
    description: "Удаление затронет в том числе игровые данные, привязанные к этому аккаунту",
    component: <SettingsMainDeleteAccount />
  },
]

export const SettingsMainAccount = () => {
  return (
    <SettingsContentWrapper title="Аккаунт">
      <div className="flex flex-col gap-8 w-full h-full">
        {ACCOUNT_SECTIONS.map((section, idx) => <SettingsSection key={idx} {...section} />)}
      </div>
    </SettingsContentWrapper>
  )
}
