import { reatomComponent, useUpdate } from "@reatom/npm-react"
import { Skeleton } from "@/shared/ui/skeleton"
import { Typography } from "@/shared/ui/typography"
import { Button } from "@/shared/ui/button"
import { ActionButton, AddButton, DeleteButton, EditButton } from "./ui"
import { tv } from "tailwind-variants"
import { IconArrowBackUp, IconCheck, IconPlus } from "@tabler/icons-react"
import {
  getDeletedPermIsSelectedAtom,
  permission,
  getPermIsSelectedAtom,
  permissionsByRoleListAction,
  roleDeletedPermsAtom,
  roleEditableAtom,
  getRoleIsSelectedRoleAtom,
  roleNewPermsAtom,
  rolesIsEditableAtom,
  rolesListAction,
  saveChangesAction,
  saveChangesIsValidAtom,
  toggleRoleEditAction
} from "../models/roles.model"
import { getFromDictionary } from "@/shared/models/app/utils"
import { scrollableVariant } from "@/shared/consts/style-variants"
import { Menu } from '@ark-ui/react/menu'
import { menuArrowTipVariant, menuArrowVariant, menuContentVariant } from "@/shared/ui/menu"
import { Noop } from "@/shared/ui/noop"

type RolePayload = {
  id: number;
  name: string;
}

const rolesListPermItemVariant = tv({
  base: `
    flex items-center group
    data-[state=active]:bg-green-500/60
    data-[state=inactive]:bg-transparent
    data-[state=deleted]:bg-red/60
    border border-neutral-800 px-2 py-1 rounded-lg justify-between w-full gap-2
  `,
  slots: {
    name: `
      text-base
      group-data-[state=active]:text-neutral-50
      group-data-[state=inactive]:text-neutral-50
      group-data-[state=deleted]:text-neutral-50
    `,
    id: "flex items-center justify-center h-6 min-w-6 aspect-auto w-fit bg-neutral-700 rounded-sm p-1"
  }
})

const RolesListItemPermsItemSkeleton = () => {
  return (
    <div className={rolesListPermItemVariant().base()}>
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-6" />
      </div>
      <Skeleton className="h-6 w-6" />
    </div>
  )
}

const RolesListItemPermsItem = reatomComponent<RolePayload>(({ ctx, id, name }) => {
  const selected = ctx.spy(getDeletedPermIsSelectedAtom(id));

  return (
    <div
      className={rolesListPermItemVariant().base()}
      data-state={selected ? "deleted" : "inactive"}
    >
      <div className="flex items-center gap-2">
        <Typography className={rolesListPermItemVariant().name()}>
          {name}
        </Typography>
        <div className={rolesListPermItemVariant().id()}>
          <span>{id}</span>
        </div>
      </div>
      {selected
        ? <AddButton onClick={() => permission.addDeletedPermRoleAction(ctx, id)} />
        : <DeleteButton onClick={() => permission.addDeletedPermAction(ctx, { id, name })} />
      }
    </div>
  )
}, "RolesListItemPermsItem")

const RolesListItemNewPermsItem = reatomComponent<RolePayload>(({ ctx, id, name }) => {
  const selected = ctx.spy(getPermIsSelectedAtom(id))

  return (
    <div className={rolesListPermItemVariant().base()} data-state="active">
      <div className="flex items-center gap-2">
        <Typography className={rolesListPermItemVariant().name()}>
          {name}
        </Typography>
        <div className={rolesListPermItemVariant().id()}>
          <span>{id}</span>
        </div>
      </div>
      {selected
        ? <DeleteButton onClick={() => permission.deleteNewPermAction(ctx, id)} />
        : <AddButton onClick={() => permission.addNewPermAction(ctx, { id, name })} />
      }
    </div>
  )
}, "RolesListItemNewPermsItem")

const RolesListItemPermsSkeleton = () => {
  return (
    <>
      <RolesListItemPermsItemSkeleton />
      <RolesListItemPermsItemSkeleton />
      <RolesListItemPermsItemSkeleton />
      <RolesListItemPermsItemSkeleton />
    </>
  )
}

const RolesListItemPerms = reatomComponent(({ ctx }) => {
  const id = ctx.spy(roleEditableAtom)?.id
  const data = ctx.spy(permissionsByRoleListAction.dataAtom)

  useUpdate((ctx) => id && permissionsByRoleListAction(ctx, id), [id])

  if (ctx.spy(permissionsByRoleListAction.statusesAtom).isPending) {
    return <RolesListItemPermsSkeleton />
  }

  if (!data) return <Noop title="пусто" />

  return data.permissions.map((p) => <RolesListItemPermsItem key={p.id} {...p} />)
}, "RolesListItemPerms")


const RolesListItemAvailableItem = reatomComponent<RolePayload>(({ ctx, id, name }) => {
  const selected = ctx.spy(getPermIsSelectedAtom(id))

  return (
    <div
      className={rolesListPermItemVariant().base()}
      data-state={selected ? "active" : "inactive"}
    >
      <div className="flex items-center gap-2">
        <Typography className={rolesListPermItemVariant().name()}>
          {name}
        </Typography>
        <div className={rolesListPermItemVariant().id()}>
          {id}
        </div>
      </div>
      {!selected && <AddButton onClick={() => permission.addNewPermAction(ctx, { id, name })} />}
    </div>
  )
}, "RolesListItemAvailableItem")

const RolesListItemSaveChanges = reatomComponent(({ ctx }) => {
  const isDisabled = !ctx.spy(saveChangesIsValidAtom)
    || ctx.spy(saveChangesAction.statusesAtom).isPending

  return (
    <ActionButton
      icon={IconCheck}
      onClick={() => saveChangesAction(ctx)}
      disabled={isDisabled}
      variant="selected"
    />
  )
}, "RolesListItemSaveChanges")

const RolesListItemAddPerm = reatomComponent(({ ctx }) => {
  const id = ctx.spy(roleEditableAtom)?.id
  if (!id) return null;

  const availablePerms = ctx.spy(permission.availablePerms)

  const isDisabled = availablePerms.length === 0

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button
          className="gap-2 font-semibold text-lg bg-neutral-800"
          disabled={isDisabled}
        >
          Добавить
          <IconPlus size={18} />
        </Button>
      </Menu.Trigger>
      <Menu.Positioner>
        <Menu.Content className={menuContentVariant()}>
          <Menu.Arrow className={menuArrowVariant()}>
            <Menu.ArrowTip className={menuArrowTipVariant()} />
          </Menu.Arrow>
          <div className="flex flex-col gap-2 p-2 w-full h-fit">
            <Typography className="text-neutral-400 text-sm">
              Доступные разрешения
            </Typography>
            <div className="flex flex-col scrollbar scrollbar-thumb-neutral-800 gap-1 max-h-[200px] overflow-y-auto w-full">
              {availablePerms.map((permission) => (
                <RolesListItemAvailableItem key={permission.id} {...permission} />
              ))}
            </div>
          </div>
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  )
}, "RolesListItemAddPerm")

const rolesListItemVariant = tv({
  base: `flex flex-col w-full gap-2 border border-neutral-800 rounded-lg p-2`,
  slots: {
    group: "flex items-center justify-between gap-1",
    name: `flex items-center justify-center gap-2`,
  }
})

const RolesListItemSkeleton = () => {
  return (
    <div className={rolesListItemVariant().base()}>
      <div className={rolesListItemVariant().name()}>
        <Skeleton className="h-6 w-24" />
      </div>
      <Skeleton className="h-6 w-6" />
    </div>
  )
}

const RolesListItem = reatomComponent<RolePayload>(({ ctx, id, name }) => {
  const isSelected = ctx.spy(getRoleIsSelectedRoleAtom(id));

  const title = getFromDictionary(ctx, name)

  return (
    <div className={rolesListItemVariant().base()}>
      <div className={rolesListItemVariant().group()}>
        <div className={rolesListItemVariant().name()}>
          <Typography>{title}</Typography>
        </div>
        <div className="flex gap-1 items-center">
          {isSelected ? (
            <>
              <ActionButton
                icon={IconArrowBackUp}
                variant="default"
                onClick={() => toggleRoleEditAction(ctx, { id, name })}
              />
              <RolesListItemSaveChanges />
            </>
          ) : (
            <>
              <EditButton
                onClick={() => toggleRoleEditAction(ctx, { id, name })}
              />
            </>
          )}
        </div>
      </div>
      {isSelected && <RolesEditable />}
    </div>
  )
}, "RolesListItem")

const RolesListSkeleton = () => {
  return (
    <>
      <RolesListItemSkeleton />
      <RolesListItemSkeleton />
      <RolesListItemSkeleton />
    </>
  )
}

const RolesList = reatomComponent(({ ctx }) => {
  useUpdate(rolesListAction, []);

  const data = ctx.spy(rolesListAction.dataAtom)

  if (ctx.spy(rolesListAction.statusesAtom).isPending) {
    return <RolesListSkeleton />
  }

  if (!data) return null;

  return data.map((role) => <RolesListItem key={role.id} {...role} />)
}, "RolesList")

const RolesListItemNewPerms = reatomComponent(({ ctx }) => {
  const data = ctx.spy(roleNewPermsAtom);
  if (data.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 w-full h-fit">
      {data.map((p) => <RolesListItemNewPermsItem key={p.id} {...p} />)}
    </div>
  )
}, "RolesListItemNewPerms")

const RolesEditablePermHeader = reatomComponent(({ ctx }) => {
  return (
    <div className="flex gap-3 items-center">
      <Typography className="text-neutral-50 text-base">
        Разрешения
      </Typography>
      <div className="flex items-center text-sm">
        <Typography>
          {"("}всего: {ctx.spy(permissionsByRoleListAction.dataAtom)?.permissions.length ?? 0},&nbsp;
        </Typography>
        <Typography className="text-green-500">
          +: {ctx.spy(roleNewPermsAtom).length},&nbsp;
        </Typography>
        <Typography className="text-red">
          -: {ctx.spy(roleDeletedPermsAtom).length}{")"}
        </Typography>
      </div>
    </div>
  )
}, "RolesEditablePermHeader")

const RolesEditable = reatomComponent(({ ctx }) => {
  if (!ctx.spy(rolesIsEditableAtom)) return null;

  return (
    <div className="flex flex-col h-fit w-full gap-2">
      <div className="flex flex-col gap-2">
        <RolesEditablePermHeader />
        <div
          className={scrollableVariant({
            className: `flex flex-col gap-1 max-h-[200px] scrollbar-w-2 rounded-lg pr-1 overflow-y-auto`
          })}
        >
          <RolesListItemPerms />
          <RolesListItemNewPerms />
        </div>
      </div>
      <div className="flex justify-end items-center gap-2 w-full">
        <RolesListItemAddPerm />
      </div>
    </div>
  )
}, "RolesEditable")

export const Roles = () => {
  return (
    <div className="flex flex-col w-full gap-4 justify-between">
      <div className="flex flex-col gap-2 w-full grow">
        <RolesList />
      </div>
    </div>
  )
}
