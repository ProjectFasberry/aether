import { reatomComponent } from "@reatom/npm-react"
import { Button } from "@repo/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@repo/ui/dialog"
import { Typography } from "@repo/ui/typography"
import { type SettingsSectionItem } from "../models/settings.model"
import { SettingsContentWrapper, SettingsSection } from "./ui"

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
    <Dialog>
      <DialogTrigger asChild>
        <Button background="white" disabled={true} className="w-fit">
          <Typography className="leading-5 font-semibold">
            Изменить пароль
          </Typography>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="text-center text-xl">Изменение пароля</DialogTitle>
        <Typography>

        </Typography>
      </DialogContent>
    </Dialog>
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
