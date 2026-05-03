import { appState } from "@/shared/models/app.model"
import { reatomComponent } from "@reatom/npm-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@repo/ui/dropdown-menu"
import { Typography } from "@repo/ui/typography"
import {
  rolesAction,
  userActionsChangeRoleDropdownMenuIsOpenAtom,
  usersControlRolesAction,
  usersControlRolesBeforeAction,
  usersControlTargetRoleIdAtom
} from "../models/users.model"
import { IconDotsVertical, IconPencil } from "@tabler/icons-react"
import { Button } from "@repo/ui/button"
import { Skeleton } from "@repo/ui/skeleton"
import { Role as RoleType } from "@/shared/components/app/private/models/users.model"
import { itemVariant } from "./ui"

const UserActionsChangeRoleGlobalSubmit = reatomComponent(({ ctx }) => {
  const isDisabled = !ctx.spy(usersControlTargetRoleIdAtom)
    || ctx.spy(usersControlRolesAction.statusesAtom).isPending

  return (
    <Button
      background="white"
      className="font-semibold"
      disabled={isDisabled}
      onClick={() => usersControlRolesBeforeAction(ctx, [], { type: "change_role" })}
    >
      Применить
    </Button>
  )
}, "UserActionsChangeRoleGlobalSubmit")

const UserActionsChangeRoleSubmit = reatomComponent<{ nickname: string }>(({ ctx, nickname }) => {
  const isDisabled = !ctx.spy(usersControlTargetRoleIdAtom)
    || ctx.spy(usersControlRolesAction.statusesAtom).isPending

  return (
    <Button
      background="white"
      className="font-semibold"
      disabled={isDisabled}
      onClick={() => usersControlRolesBeforeAction(ctx, [nickname], { type: "change_role" })}
    >
      Применить
    </Button>
  )
}, "UserActionsChangeRoleSubmit")

const Role = reatomComponent<RoleProps>(({ ctx, name, id, selectedId, onClick }) => {
  const title = appState.dict.get(ctx, name);
  const isSelected = selectedId === id;

  return (
    <div
      onClick={() => onClick(id)}
      className={itemVariant({ variant: isSelected ? "selected" : "default" })}
    >
      <Typography>{title}</Typography>
    </div>
  )
}, "Role")

const RolesSkeleton = () => {
  return (
    <>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </>
  )
}

type RoleProps = RoleType & {
  onClick: (id: number) => void
  selectedId?: number
}

const Roles = reatomComponent<Pick<RoleProps, "onClick" | "selectedId">>(({ ctx, selectedId, onClick }) => {
  const data = ctx.spy(rolesAction.dataAtom)

  if (ctx.spy(rolesAction.statusesAtom).isPending)  return <RolesSkeleton />;
  if (!data) return null;

  return data.map((role) => (
    <Role
      key={role.id}
      {...role}
      selectedId={selectedId}
      onClick={onClick}
    />
  ))
}, "Roles")

export const UserActionsChangeRoleGlobal = reatomComponent(({ ctx }) => {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger>
        <div className="flex items-center justify-center h-8 w-8 aspect-square bg-neutral-800 rounded-md">
          <IconDotsVertical size={16} />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <div className="flex flex-col gap-2 p-2 w-full h-full min-w-40">
          <Typography className="text-neutral-400">
            Доступные роли
          </Typography>
          <div className="flex flex-col gap-1 w-full h-full">
            <Roles onClick={(roleId) => usersControlTargetRoleIdAtom(ctx, roleId)} />
          </div>
          <UserActionsChangeRoleGlobalSubmit />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}, "UserActionsChangeRoleGlobal")

export const UserActionsChangeRoleLocal = reatomComponent<{
  nickname: string, role_id: number, role_name: string
}>(({
  ctx, nickname, role_id, role_name
}) => {
  const roleTitle = appState.dict.get(ctx, role_name)

  return (
    <DropdownMenu
      open={ctx.spy(userActionsChangeRoleDropdownMenuIsOpenAtom)}
      onOpenChange={v => userActionsChangeRoleDropdownMenuIsOpenAtom(ctx, v)}
      modal={false}
    >
      <DropdownMenuTrigger className="cursor-pointer">
        <div className="flex rounded-lg gap-2 items-center text-neutral-950 justify-center max-w-36 px-2 bg-neutral-50 h-6">
          <Typography className='select-none font-semibold'>
            {roleTitle}
          </Typography>
          <IconPencil size={18} />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <div className="flex flex-col gap-2 p-2 w-full h-full min-w-40">
          <Typography className="text-neutral-400">
            Доступные роли
          </Typography>
          <div className="flex flex-col gap-1 w-full h-full">
            <Roles
              selectedId={ctx.spy(usersControlTargetRoleIdAtom) ?? role_id}
              onClick={(roleId) => usersControlTargetRoleIdAtom(ctx, roleId)}
            />
          </div>
          <UserActionsChangeRoleSubmit nickname={nickname} />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}, "UserActionsChangeRoleLocal")