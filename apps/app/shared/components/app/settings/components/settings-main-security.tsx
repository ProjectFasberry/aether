import { reatomComponent, useUpdate } from "@reatom/npm-react"
import { Button } from "@repo/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@repo/ui/dialog"
import { Typography } from "@repo/ui/typography"
import { SettingsSection } from "./ui"
import { IconDeviceDesktop } from "@tabler/icons-react"
import { appState } from "@/shared/models/app.model"
import { accountActiveSessionsAction, accountCurrentSessionAction, fetchSessions, SessionPayload } from "../models/settings-security.model"
import { ClientOnly } from "vike-react/ClientOnly"
import { AccountSessionsConnectNew } from "./settings-main-security-new-session"
import { Skeleton } from "@repo/ui/skeleton"

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

const SessionItem = ({ id, browser, geo }: SessionPayload) => {
  return (
    <div className="flex items-center overflow-hidden h-12 gap-2 w-full">
      <div className="flex bg-neutral-700 rounded-full items-center justify-center w-12 h-12">
        <IconDeviceDesktop size={24} />
      </div>
      <div className="flex flex-col justify-center h-full">
        <p className="text-base font-medium leading-5">
          {browser}
        </p>
        <p className="text-neutral-400 text-sm leading-4">
          {geo.city}, {geo.country}
        </p>
      </div>
    </div>
  )
}

const AccountSessionsListActive = reatomComponent(({ ctx }) => {
  if (ctx.spy(accountActiveSessionsAction.statusesAtom).isPending) {
    return (
      <>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </>
    )
  }

  const list = ctx.spy(accountActiveSessionsAction.dataAtom);
  if (!list || !list.length) return <p className='text-neutral-400 text-sm leading-3'>пусто</p>

  return list?.map((session) => <SessionItem key={session.id} {...session} />)
}, "AccountSessionsListActive")

const AccountSessionsListCurrent = reatomComponent(({ ctx }) => {
  if (ctx.spy(accountCurrentSessionAction.statusesAtom).isPending) {
    return <Skeleton className="h-12 w-full" />
  }

  const current = ctx.spy(accountCurrentSessionAction.dataAtom)
  if (!current) return <p className='text-neutral-400 text-sm leading-3'>пусто</p>

  return <SessionItem {...current} />
}, "AccountSessionsListCurrent")

const AccountSessionsList = () => {
  useUpdate(fetchSessions, []);

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col gap-2 w-full">
        <p className="text-base font-medium leading-5">Текущая сессия</p>
        <AccountSessionsListCurrent />
      </div>
      <div className="flex flex-col gap-2 w-full">
        <p className="text-base font-medium leading-5">Активные сессии</p>
        <AccountSessionsListActive />
      </div>
    </div>
  )
}

const AccountSessions = reatomComponent(({ ctx }) => {
  const isMobile = ctx.spy(appState.isMobile)

  return (
    <div className="flex flex-col gap-4 w-full">
      {isMobile && (
        <ClientOnly>
          <AccountSessionsConnectNew />
        </ClientOnly>
      )}
      <AccountSessionsList />
    </div>
  )
}, "AccountSessions")

const ChangePassword = reatomComponent(({ ctx }) => {
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