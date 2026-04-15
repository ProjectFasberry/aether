import { reatomComponent, useUpdate } from "@reatom/npm-react"
import { Button } from "@repo/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@repo/ui/dialog"
import { Typography } from "@repo/ui/typography"
import { SettingsSection } from "./ui"
import { IconDeviceDesktop, IconQrcode } from "@tabler/icons-react"
import { appState } from "@/shared/models/app.model"
import { accountActiveSessionsAction, accountCurrentSessionAction, SessionPayload } from "../models/settings-security.model"

const DeleteAccount = reatomComponent(({ ctx }) => {
  return (
    <>
      <Button
        disabled={true}
        className="w-fit self-start bg-red-600/80"
        onClick={() => { }}
      >
        <Typography className="leading-5 font-semibold">
          Удалить аккаунт
        </Typography>
      </Button>
    </>
  )
}, "DeleteAccount")

const AccountSessionsConnectNew = reatomComponent(({ ctx }) => {
  return (
    <div className="flex flex-col gap-2 w-full">
      <p>
        Привяжи устройство к аккаунту, отсканировав QR-код
      </p>
      <Button background="white" className="gap-2 font-semibold">
        <IconQrcode size={16} />
        Привязать устройство
      </Button>
    </div>
  )
}, "AccountSessionsConnectNew")

const SessionItem = ({ id, browser, geo }: SessionPayload) => {
  return (
    <div className="flex items-center h-12 gap-2 w-full">
      <div className="flex bg-neutral-700 rounded-full items-center justify-center w-12 h-12">
        <IconDeviceDesktop size={24} />
      </div>
      <div className="flex flex-col">
        <p>
          {browser}
        </p>
        <p>
          {geo.city}, {geo.country}
        </p>
      </div>
    </div>
  )
}

const AccountSessionsList = reatomComponent(({ ctx }) => {
  useUpdate((ctx) => {
    accountActiveSessionsAction(ctx)
    accountCurrentSessionAction(ctx)
  }, []);

  const list = ctx.spy(accountActiveSessionsAction.dataAtom);
  const current = ctx.spy(accountCurrentSessionAction.dataAtom)

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col gap-2 w-full">
        <p>Текущая сессия</p>
        {current && (
          <SessionItem {...current} />
        )}
      </div>
      <div className="flex flex-col gap-2 w-full">
        <p>Активные сессии</p>
        {list?.map((session) => (
          <SessionItem key={session.id} {...session} />
        ))}
      </div>
    </div>
  )
}, "AccountSessionsList")

const AccountSessions = reatomComponent(({ ctx }) => {
  const isMobile = ctx.spy(appState.isMobile)

  return (
    <div className="flex flex-col gap-4 w-full">
      {isMobile && <AccountSessionsConnectNew />}
      <AccountSessionsList />
    </div>
  )
}, "AccountSessions")

const ChangePassword = reatomComponent(({ ctx }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button background="white" className="w-fit">
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

const SECTIONS = [
  {
    title: "Сессии",
    subtitle: "Активные сессии вашего аккаунта",
    component: <AccountSessions />
  },
  {
    title: "Пароль и аутенфикация",
    subtitle: "Изменение пароля от аккаунта",
    component: <ChangePassword />
  },
  {
    title: "Удаление аккаунта",
    subtitle: "Удаление затронет в том числе игровые данные, привязанные к этому аккаунту",
    component: <DeleteAccount />
  },
]

export const SettingsMainSecurity = () => {
  return (
    <div className="flex flex-col gap-8 w-full h-full">
      {SECTIONS.map((section, idx) => (
        <SettingsSection key={idx} {...section} />
      ))}
    </div>
  )
}