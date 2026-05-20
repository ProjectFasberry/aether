import { Link } from "@/shared/components/config/link"
import { tv } from "tailwind-variants"
import { getFromDictionary } from "@/shared/models/app/utils";
import { currentUserState } from "@/shared/models/current-user/index.model";
import { action, atom } from "@reatom/framework";
import { reatomComponent, useUpdate } from "@reatom/npm-react";
import { Typography } from "@/shared/ui/typography"
import { IconArrowsDiagonal } from "@tabler/icons-react";
import { Dialog } from '@ark-ui/react/dialog'
import { Portal } from '@ark-ui/react/portal'
import { dialogBackdropVariant, DialogClose, dialogContentVariant, dialogPositionerVariant, dialogTitleVariant } from "@/shared/ui/dialog";
import { useState } from "react";
import { scrollableVariant } from "@/shared/consts/style-variants";

type Perms = {
  read: string[], create: string[], update: string[], delete: string[], unknown: string[],
}

const permsAtom = atom<Perms>({
  read: [], create: [], update: [], delete: [], unknown: [],
});

const transformPermsByNamespace = action((ctx) => {
  const targets = ctx.get(currentUserState.perms);
  if (!targets) return null;

  permsAtom(ctx, {
    read: targets.filter(t => t.endsWith(".read")),
    create: targets.filter(t => t.endsWith(".create")),
    update: targets.filter(t => t.endsWith(".update")),
    delete: targets.filter(t => t.endsWith(".delete")),
    unknown: targets.filter(
      t => !/\.(read|create|update|delete)$/.test(t)
    ),
  });
})

const groupsAtom = atom((ctx) => {
  const perms = ctx.spy(permsAtom)

  return [
    { title: "Read", data: perms.read },
    { title: "Create", data: perms.create },
    { title: "Update", data: perms.update },
    { title: "Delete", data: perms.delete },
    { title: "Unknown", data: perms.unknown },
  ].filter(g => g.data && g.data.length > 0);
})

const UserInfo = reatomComponent(({ ctx }) => {
  const [open, setOpen] = useState(false)

  useUpdate(transformPermsByNamespace, []);

  const currentUser = ctx.spy(currentUserState);
  if (!currentUser) return null;

  const role = ctx.spy(currentUserState.role)
  if (!role) return null;

  const groups = ctx.spy(groupsAtom)
  const roleTitle = getFromDictionary(ctx, role.name)

  return (
    <Dialog.Root open={open} onOpenChange={({ open }) => setOpen(open)}>
      <Dialog.Trigger className="flex justify-between rounded-xl bg-neutral-800 h-6 sm:h-10 overflow-hidden px-2 sm:px-4 gap-2 items-center">
        <Typography className="text-sm sm:text-base font-semibold">
          <span className="hidden sm:inline">Роль:&nbsp;</span>
          <span>{roleTitle.toLowerCase()}</span>
        </Typography>
        <IconArrowsDiagonal className="text-neutral-400 h-3 w-3 sm:h-4.5 sm:w-4.5" />
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop className={dialogBackdropVariant()} />
        <Dialog.Positioner className={dialogPositionerVariant()}>
          <Dialog.Content className={dialogContentVariant({ className: "items-start! justify-start! h-2/3" })}>
            <Dialog.Title className={dialogTitleVariant()}>Разрешения</Dialog.Title>
            <div className="flex flex-col gap-2 h-full overflow-y-auto rounded-xl scrollbar scrollbar-thumb-neutral-800 w-full">
              {groups.map((group) => (
                <div
                  key={group.title}
                  className="flex flex-col border h-full border-neutral-800 p-1 sm:p-2 rounded-xl gap-2 w-full"
                >
                  <Typography className="text-base sm:text-lg font-semibold">{group.title}</Typography>
                  <div className="flex flex-col gap-1 w-full">
                    {group.data.map(item => <span key={item} className="text-[12px] sm:text-sm">-&nbsp;{item}</span>)}
                  </div>
                </div>
              ))}
            </div>
            <DialogClose />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}, "Info")

const linkVariant = tv({
  base: `
    flex justify-start items-center group h-6 sm:h-10 rounded-xl px-2 sm:px-4
    data-[state=inactive]:bg-neutral-800 data-[state=inactive]:text-neutral-50
    data-[state=active]:bg-neutral-50 data-[state=active]:text-neutral-950
  `,
  slots: {
    text: "font-semibold text-nowrap text-sm sm:text-base"
  }
})

const links = [
  { title: "Конфигурация", value: "/private/config" },
  { title: "Мессенджер", value: "/private/messenger" },
  { title: "Магазин", value: "/private/store" },
  { title: "Игрок", value: "/private/users" },
  { title: "История", value: "/private/history" },
  { title: "Панель", value: "/private/panel" },
  { title: "Дашборд", value: "/private/dashboard" },
  { title: "Тестовое", value: "/private/test" },
]

const SidebarHeader = () => {
  return (
    <div className="flex flex-col gap-1 w-full">
      <span className="hidden lg:inline">Инфо</span>
      <UserInfo />
    </div>
  )
}

const SidebarBody = () => {
  return (
    <div className="flex flex-row items-center lg:items-stretch lg:flex-col gap-1 w-full">
      <span className="hidden lg:inline">Навигация</span>
      {links.map((link) => (
        <Link key={link.title} href={link.value} className={linkVariant().base()}>
          <Typography className={linkVariant().text()}>
            {link.title}
          </Typography>
        </Link>
      ))}
    </div>
  )
}

export const Sidebar = () => {
  return (
    <div
      className={scrollableVariant({
        className: `
          flex sm:h-fit sm:max-h-fit h-12 max-h-12 items-center sm:items-stretch sticky z-20 top-2 flex-row overflow-x-auto lg:flex-col
          border lg:border-transparent border-neutral-800 gap-2 lg:gap-4 w-full
          lg:w-1/5 p-2 lg:p-3 bg-neutral-900 rounded-xl scrollbar-h-2 overflow-y-hidden
        `
      })}
    >
      <SidebarHeader />
      <SidebarBody />
    </div>
  )
}
