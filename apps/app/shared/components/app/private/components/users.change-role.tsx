import { appState } from "@/shared/models/app.model"
import { reatomComponent } from "@reatom/npm-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@repo/ui/dropdown-menu"
import { Typography } from "@repo/ui/typography"
import { usersControlRoles, usersControlState } from "../models/users.model"
import { IconDotsVertical, IconPencil } from "@tabler/icons-react"
import { Button } from "@repo/ui/button"
import { Skeleton } from "@repo/ui/skeleton"
import { Role as RoleType } from "@/shared/components/app/private/models/users.model"
import { itemVariant } from "./ui"

const UserActionsChangeRoleGlobalSubmit = reatomComponent(({ ctx }) => {
  const isDisabled = !ctx.spy(usersControlState.targetRoleId)
    || ctx.spy(usersControlRoles.submit.statusesAtom).isPending

  return (
    <Button
      background="white"
      className="font-semibold"
      disabled={isDisabled}
      onClick={() => usersControlRoles.before(ctx, [], { type: "change_role" })}
    >
      Применить
    </Button>
  )
}, "UserActionsChangeRoleGlobalSubmit")

const UserActionsChangeRoleSubmit = reatomComponent<{ nickname: string }>(({ ctx, nickname }) => {
  const isDisabled = !ctx.spy(usersControlState.targetRoleId)
    || ctx.spy(usersControlRoles.submit.statusesAtom).isPending

  return (
    <Button
      background="white"
      className="font-semibold"
      disabled={isDisabled}
      onClick={() => usersControlRoles.before(ctx, [nickname], { type: "change_role" })}
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
      className={itemVariant({ variant: isSelected ? "selected" : "default" })}
      onClick={() => onClick(id)}
    >
      <Typography>{title}</Typography>
    </div>
  )
}, "Role")

const RolesSkeleton = () => Array.from({ length: 3 }).map((_, idx) => <Skeleton key={idx} className="h-10 w-full" />)

type RoleProps = RoleType & {
  onClick: (id: number) => void
  selectedId?: number
}

const Roles = reatomComponent<Pick<RoleProps, "onClick" | "selectedId">>(({ ctx, selectedId, onClick }) => {
  const data = ctx.spy(usersControlRoles.fetch.dataAtom)

  if (ctx.spy(usersControlRoles.fetch.statusesAtom).isPending) return <RolesSkeleton />;
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
      <DropdownMenuTrigger className="flex items-center justify-center h-8 w-8 aspect-square bg-neutral-800 rounded-md">
        <IconDotsVertical size={16} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <div className="flex flex-col gap-2 p-2 w-full h-full min-w-40">
          <Typography className="text-neutral-400">
            Доступные роли
          </Typography>
          <div className="flex flex-col gap-1 w-full h-full">
            <Roles onClick={(roleId) => usersControlState.targetRoleId(ctx, roleId)} />
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
  const openedId = ctx.spy(usersControlState.selectedId)
  const isThisOpen = openedId === nickname

  const roleTitle = appState.dict.get(ctx, role_name)

  return (
    <DropdownMenu
      open={isThisOpen}
      onOpenChange={(isOpen) => {
        usersControlState.selectedId(ctx, isOpen ? nickname : null);
      }}
    >
      <DropdownMenuTrigger className="flex rounded-lg gap-1 items-center text-neutral-950 justify-center max-w-36 px-2 bg-neutral-50 h-5">
        <IconPencil size={12} />
        <Typography className='select-none text-sm leading-4'>
          {roleTitle}
        </Typography>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <div className="flex flex-col gap-2 p-2 w-full h-full min-w-40">
          <Typography className="text-sm text-neutral-400">
            Доступные роли
          </Typography>
          <div className="flex flex-col gap-1 w-full h-full">
            <Roles
              selectedId={ctx.spy(usersControlState.targetRoleId) ?? role_id}
              onClick={(roleId) => usersControlState.targetRoleId(ctx, roleId)}
            />
          </div>
          <UserActionsChangeRoleSubmit nickname={nickname} />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}, "UserActionsChangeRoleLocal")