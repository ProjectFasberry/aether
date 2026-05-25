import { reatomComponent } from "@reatom/npm-react"
import { Button } from "@/shared/ui/button"
import { Typography } from "@/shared/ui/typography"
import { type SettingsSectionItem } from "../models/settings.model"
import { SettingsContentWrapper, SettingsSection } from "./ui"
import { Dialog, DialogPositioner } from "@ark-ui/react/dialog"
import { Portal } from "@ark-ui/react/portal"
import { dialogBackdropVariant, DialogClose, dialogContentVariant, dialogPositionerVariant, dialogTitleVariant } from "@/shared/ui/dialog"
import { currentUserState } from "@/shared/models/current-user/index.model"
import { Avatar } from "@/shared/ui/avatar"
import { Menu } from "@ark-ui/react/menu"
import { dropdownMenuItemVariants, menuContentVariant, menuTriggerVariant } from "@/shared/ui/menu"
import { IconDots } from "@tabler/icons-react"
import dayjs from "@/shared/lib/create-dayjs"
import { settingsAccountModel } from "../models/settings-account.model"
import { Input } from "@/shared/ui/input"
import { toast } from "sonner"
import { action } from "@reatom/framework"
import { ErrorBlock } from "@/shared/ui/error-block"

const { deleteAccount, changePass, changePassState } = settingsAccountModel()

const SettingsMainDeleteAccount = reatomComponent(({ ctx }) => {
  return (
    <Button
      className="w-fit self-start bg-red/80"
      onClick={() => deleteAccount.before(ctx)}
      disabled={ctx.spy(deleteAccount.submit.statusesAtom).isPending}
    >
      <Typography className="leading-5 font-semibold">
        Удалить аккаунт
      </Typography>
    </Button>
  )
}, "DeleteAccount")

const CHANGE_PASSWORD_FIELDS = [
  { placeholder: "Текущий пароль", value: changePassState.currentPass },
  { placeholder: "Новый пароль", value: changePassState.newPass },
  { placeholder: "Подтверждение нового пароля", value: changePassState.newPassRepeat }
]

const SettingsMainChangePassword = reatomComponent(({ ctx }) => {
  const error = ctx.spy(changePass.submit.errorAtom);

  return (
    <>
      <Button
        background="white"
        className="w-fit font-semibold"
        onClick={() => changePass.before(ctx)}
      >
        Изменить пароль
      </Button>
      <Dialog.Root
        open={ctx.spy(changePassState.isOpen)}
        onOpenChange={({ open }) => changePassState.isOpen(ctx, open)}
      >
        <Portal>
          <Dialog.Backdrop className={dialogBackdropVariant()} />
          <DialogPositioner className={dialogPositionerVariant()}>
            <Dialog.Content className={dialogContentVariant({ className: "w-1/4!" })}>
              <Dialog.Title className={dialogTitleVariant()}>Изменение пароля</Dialog.Title>
              <form
                className="flex flex-col gap-6 w-full inert:opacity-60 inert:pointer-events-none"
                onSubmit={e => changePass.handle(ctx, e)}
                inert={ctx.spy(changePass.submit.statusesAtom).isPending}
              >
                <div className="flex flex-col gap-2 w-full">
                  {CHANGE_PASSWORD_FIELDS.map((field, idx) => (
                    <Input
                      key={idx}
                      placeholder={field.placeholder}
                      required
                      value={ctx.spy(field.value)}
                      onChange={e => field.value(ctx, e.target.value)}
                    />
                  ))}
                </div>
                {error && (
                  <ErrorBlock title={error?.message} />
                )}
                <div className="flex items-center w-full *:w-full gap-2">
                  <Dialog.CloseTrigger asChild>
                    <Button type="button" background="default" className="font-semibold">
                      Назад
                    </Button>
                  </Dialog.CloseTrigger>
                  <Button type="submit" background="white" className="font-semibold">
                    Подтвердить
                  </Button>
                </div>
              </form>
              <DialogClose />
            </Dialog.Content>
          </DialogPositioner>
        </Portal>
      </Dialog.Root>
    </>
  )
}, "ChangePassword")

const INFO_ACTIONS_LIST = [
  {
    label: "Скопировать UUID",
    action: (value: string) => action(async (ctx) => {
      await navigator.clipboard.writeText(value);
      toast.success("Скопировано в буфер обмена")
    }),
    value: "copy-uuid"
  }
]
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
          onSelect={({ value }) => INFO_ACTIONS_LIST.find(d => d.value === value)?.action(uuid)(ctx)}
        >
          <Menu.Trigger className={menuTriggerVariant()}>
            <IconDots size={22} className="text-neutral-400" />
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content className={menuContentVariant()}>
                {INFO_ACTIONS_LIST.map((item) => (
                  <Menu.Item key={item.value} value={item.value} className={dropdownMenuItemVariants()}>
                    {item.label}
                  </Menu.Item>
                ))}
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

export const SettingsAccount = () => {
  return (
    <SettingsContentWrapper title="Аккаунт">
      <div className="flex flex-col gap-8 w-full h-full">
        {ACCOUNT_SECTIONS.map((section, idx) => <SettingsSection key={idx} {...section} />)}
      </div>
    </SettingsContentWrapper>
  )
}
