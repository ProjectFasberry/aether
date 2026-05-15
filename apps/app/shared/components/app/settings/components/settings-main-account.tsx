import { reatomComponent } from "@reatom/npm-react"
import { Button } from "@/shared/ui/button"
import { Typography } from "@/shared/ui/typography"
import { type SettingsSectionItem } from "../models/settings.model"
import { SettingsContentWrapper, SettingsSection } from "./ui"
import { Dialog, DialogPositioner } from "@ark-ui/react/dialog"
import { Portal } from "@ark-ui/react/portal"
import { dialogBackdropVariant, dialogContentVariant, dialogPositionerVariant } from "@/shared/ui/dialog"
import { currentUserState } from "@/shared/models/current-user/index.model"
import { Avatar } from "@/shared/ui/avatar"
import { Menu } from "@ark-ui/react/menu"
import { dropdownMenuItemVariants, menuContentVariant, menuTriggerVariant } from "@/shared/ui/menu"
import { IconDots } from "@tabler/icons-react"
import dayjs from "@/shared/lib/create-dayjs"

const SettingsMainDeleteAccount = reatomComponent(({ ctx }) => {
  return (
    <Button
      className="w-fit self-start bg-red/80"
      onClick={() => { }}
    >
      <Typography className="leading-5 font-semibold">
        Удалить аккаунт
      </Typography>
    </Button>
  )
}, "DeleteAccount")

const SettingsMainChangePassword = reatomComponent(({ ctx }) => {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button background="white" className="w-fit">
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

const SettingsMainInfo = reatomComponent(({ ctx }) => {
  const currentUser = ctx.spy(currentUserState);
  if (!currentUser) return null;

  const { nickname, avatar, meta, uuid } = currentUser;

  return (
    <div className="flex flex-col gap-4 bg-neutral-800 rounded-xl p-4 w-full h-full">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Avatar url={avatar} nickname={nickname} className="h-12 w-12" />
          {nickname}
        </div>
        <Menu.Root
          onTriggerValueChange={({value}) => {
            if (value === 'copy-uuid') {
              navigator.clipboard.writeText(uuid);
            }
          }}
        >
          <Menu.Trigger className={menuTriggerVariant()}>
            <IconDots size={22} className="text-neutral-400" />
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content className={menuContentVariant()}>
                <Menu.Item value="copy-uuid" className={dropdownMenuItemVariants()}>
                  Скопировать UUID
                </Menu.Item>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </div>
      <div className="flex flex-col w-full gap-1">
        <span>
          Регистрация: {dayjs(meta.reg_date.toString()).format("DD.MM.YYYY")}
        </span>
        <span>
          Роль: {meta.role.name}
        </span>
      </div>
    </div>
  )
}, "SettingsMainInfo")

const ACCOUNT_SECTIONS: SettingsSectionItem[] = [
  {
    title: "Информация",
    description: "Основная информация об аккаунте",
    children: <SettingsMainInfo />
  },
  {
    title: "Пароль и аутенфикация",
    description: "Изменение пароля от аккаунта",
    children: <SettingsMainChangePassword />
  },
  {
    title: "Удаление аккаунта",
    description: "Удаление затронет в том числе игровые данные, привязанные к этому аккаунту",
    children: <SettingsMainDeleteAccount />
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
