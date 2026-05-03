import { reatomComponent } from "@reatom/npm-react"
import {
  userActionsRestrictDropdownMenuIsOpenAtom,
  usersControlPunishBeforeAction,
  usersControlReasonAtom,
  usersControlRestrictAction,
  usersControlRestrictTypeAtom,
  usersControlRestrictTypeWithArgsAtom,
  usersControlTimeAtom
} from "../models/users.model"
import { Button } from "@repo/ui/button"
import { IconBan } from "@tabler/icons-react"
import { itemVariant } from "./ui"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@repo/ui/dialog"
import { Input } from "@repo/ui/input"
import { Separator } from "@repo/ui/separator"

const USER_ACTIONS = [
  { title: "Бан", type: "ban", },
  { title: "Разбан", type: "unban" },
  { title: "Мут", type: "mute", },
  { title: "Размут", type: "unmute" },
  { title: "Кик", type: "kick", },
  { title: "Выйти из сессии", type: "unlogin", }
] as const

const UserActionsRestrictGlobalSubmit = reatomComponent(({ ctx }) => {
  const isDisabled = !ctx.spy(usersControlRestrictTypeAtom)
    || ctx.spy(usersControlRestrictAction.statusesAtom).isPending

  return (
    <Button
      className="bg-neutral-50 text-neutral-950 text-lg font-semibold"
      disabled={isDisabled}
      onClick={() => usersControlPunishBeforeAction(ctx, [])}
    >
      Применить
    </Button>
  )
}, "UserActionsRestrictGlobalSubmit")

const UserActionsRestrictSubmit = reatomComponent<{ nickname: string }>(({ ctx, nickname }) => {
  const isDisabled = !ctx.spy(usersControlRestrictTypeAtom)
    || ctx.spy(usersControlRestrictAction.statusesAtom).isPending

  return (
    <Button
      background="white"
      className="font-semibold"
      disabled={isDisabled}
      onClick={() => usersControlPunishBeforeAction(ctx, [nickname])}
    >
      Применить
    </Button>
  )
}, "UserActionsRestrictSubmit")

export const UserActionsRestrictGlobal = reatomComponent(({ ctx }) => {
  return (
    <Dialog
      open={ctx.spy(userActionsRestrictDropdownMenuIsOpenAtom)}
      onOpenChange={v => userActionsRestrictDropdownMenuIsOpenAtom(ctx, v)}
    >
      <DialogTrigger>
        <div className="flex items-center justify-center h-8 w-8 aspect-square bg-neutral-800 rounded-md">
          <IconBan size={16} />
        </div>
      </DialogTrigger>
      <DialogContent>
        <div className="flex flex-col gap-2 w-full h-full min-w-40">
          <DialogTitle className="text-center text-xl">Доступные действия</DialogTitle>
          <div className="flex flex-col gap-1 w-full h-full">
            {USER_ACTIONS.map((action) => (
              <Button
                key={action.type}
                className={itemVariant({
                  variant: ctx.spy(usersControlRestrictTypeAtom) === action.type ? "selected" : "default"
                })}
                onClick={() => usersControlRestrictTypeAtom(ctx, action.type)}
              >
                {action.title}
              </Button>
            ))}
          </div>
          <UserActionsRestrictArgs />
          <UserActionsRestrictGlobalSubmit />
        </div>
      </DialogContent>
    </Dialog>
  )
}, "UserActionsRestrictGlobal")

const UserActionsRestrictArgs = reatomComponent(({ ctx }) => {
  if (!ctx.spy(usersControlRestrictTypeWithArgsAtom)) return null;

  return (
    <>
      <Separator />
      <div className="flex flex-col gap-2">
        <Input
          value={ctx.spy(usersControlTimeAtom) ?? ""}
          onChange={e => usersControlTimeAtom(ctx, e.target.value)}
          placeholder="Время"
        />
        <Input
          value={ctx.spy(usersControlReasonAtom) ?? ""}
          onChange={e => usersControlReasonAtom(ctx, e.target.value)}
          placeholder="Причина"
        />
      </div>
    </>
  )
}, "UserActionsRestrictArgs")

export const UserActionsRestrictLocal = reatomComponent<{ nickname: string }>(({ ctx, nickname }) => {
  return (
    <>
      <Dialog
        open={ctx.spy(userActionsRestrictDropdownMenuIsOpenAtom)}
        onOpenChange={v => userActionsRestrictDropdownMenuIsOpenAtom(ctx, v)}
      >
        <DialogTrigger asChild>
          <Button className="p-0 h-6 w-6 aspect-square bg-neutral-800">
            <IconBan size={18} />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <div className="flex flex-col gap-2 w-full h-full min-w-40">
            <DialogTitle className="text-center text-xl">Доступные действия</DialogTitle>
            <div className="flex flex-col gap-1 w-full h-full">
              {USER_ACTIONS.map((action) => (
                <Button
                  key={action.type}
                  className={itemVariant({
                    variant: ctx.spy(usersControlRestrictTypeAtom) === action.type ? "selected" : "default"
                  })}
                  onClick={() => usersControlRestrictTypeAtom(ctx, action.type)}
                >
                  {action.title}
                </Button>
              ))}
              <UserActionsRestrictArgs />
            </div>
            <UserActionsRestrictSubmit nickname={nickname} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}, "UserActionsRestrictLocal")