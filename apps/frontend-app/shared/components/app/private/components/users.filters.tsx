import { reatomComponent } from "@reatom/npm-react";
import { UserActionsChangeRoleGlobal } from "./users.change-role";
import { users, usersState, usersLengthAtom, usersSelectedLengthAtom, usersSelectedOverAtom, usersControl, usersControlState } from "../models/users.model";
import { Skeleton } from "@/shared/ui/skeleton";
import { Button } from "@/shared/ui/button";
import { IconArrowDown, IconArrowUp, IconBan } from "@tabler/icons-react";
import { Input } from "@/shared/ui/input";
import { Menu } from '@ark-ui/react/menu'
import { UserActionsWrapper } from "./users.restrict";
import { Checkbox } from "@/shared/ui/checkbox";
import { dropdownMenuItemVariants, menuArrowTipVariant, menuArrowVariant, menuContentVariant } from "@/shared/ui/menu";
import { createViewerModel } from "@/shared/models/shared.model";

const UsersGlobalActions = reatomComponent(({ ctx }) => {
  const isSelectedOver = ctx.spy(usersSelectedOverAtom);
  if (!isSelectedOver) return null;

  return (
    <div className="flex items-center justify-center gap-1">
      <Menu.Root>
        <Menu.Trigger asChild>
          <Button background="default" className="h-8 w-8 aspect-square p-0">
            <IconBan size={16} />
          </Button>
        </Menu.Trigger>
        <Menu.Positioner>
          <Menu.Content className={menuContentVariant()}>
            <Menu.Arrow className={menuArrowVariant()}>
              <Menu.ArrowTip className={menuArrowTipVariant()} />
            </Menu.Arrow>
            <UserActionsWrapper type="global" />
          </Menu.Content>
        </Menu.Positioner>
      </Menu.Root >
      <UserActionsChangeRoleGlobal />
    </div>
  )
}, "UsersGlobalActions")

const UsersSelectedLength = reatomComponent(({ ctx }) => {
  if (!ctx.spy(usersSelectedOverAtom)) return null

  const data = ctx.spy(usersSelectedLengthAtom)
  if (data < 2) return null;

  return <>Выбрано:&nbsp;{data}</>
}, "UsersSelectedLength")

const UsersFiltersLength = reatomComponent(({ ctx }) => {
  return (
    <div className="flex items-center gap-4 w-full text-neutral-400 text-sm">
      <div className="flex text-sm items-center gap-1">
        Показано:&nbsp;
        {ctx.spy(users.fetch.statusesAtom).isPending ? <Skeleton className="h-5 w-5" /> : ctx.spy(usersLengthAtom)}
      </div>
      <div className="flex text-sm items-center gap-1">
        <UsersSelectedLength />
      </div>
    </div>
  )
}, "UsersFiltersLength")

const UsersFiltersAsc = reatomComponent(({ ctx }) => {
  return (
    <Button
      background="default"
      className="h-8 aspect-square p-0"
      onClick={() => usersState.filters.asc(ctx, (state) => !state)}
      disabled={ctx.spy(users.fetch.statusesAtom).isPending}
    >
      {ctx.spy(usersState.filters.asc) ? <IconArrowUp size={16} /> : <IconArrowDown size={16} />}
    </Button>
  )
}, 'UsersFiltersAsc')

const UsersFiltersSelect = reatomComponent(({ ctx }) => {
  return (
    <div className="flex justify-between min-h-10 h-10 duration-100 ease-in group-data-[view=true]:px-4 w-full items-center">
      <div className="flex items-center gap-2">
        <Checkbox
          id="users-filter-selectAll"
          checked={ctx.spy(usersControlState.isCheckedAll)}
          onCheckedChange={(v) => typeof v === 'boolean' && usersControl.select.all(ctx, v)}
        />
        <label htmlFor="checkbox:users-filter-selectAll:input">Выбрать все</label>
      </div>
      <UsersGlobalActions />
    </div>
  )
}, "UsersFiltersSelect")

const UsersFiltersSearchQuery = reatomComponent(({ ctx }) => {
  return (
    <Input
      value={ctx.spy(usersState.filters.searchQuery) ?? ""}
      onChange={e => users.searchQueryChangeEvent(ctx, e)}
      placeholder="Поиск по никнейму"
      maxLength={32}
      className="w-full h-8 flex-1"
    />
  )
}, "UsersFiltersSearchQuery")

const SORTS = [
  { label: "По дате регистрации", value: "created_at" },
  { label: "По роли", value: "role" },
  { label: "По алфавиту", value: "abc" }
] as const

const UsersFiltersSort = reatomComponent(({ ctx }) => {
  const current = SORTS.find(d => d.value === ctx.spy(usersState.filters.sortBy))
  if (!current) return null;

  return (
    <Menu.Root
      onSelect={(details) => usersState.filters.sortBy(ctx, details.value as typeof SORTS[number]["value"])}
    >
      <Menu.Trigger asChild>
        <Button className="px-4 h-8 w-full text-nowrap truncate min-w-0" background="default">
          {current.label}
        </Button>
      </Menu.Trigger>
      <Menu.Positioner>
        <Menu.Content className={menuContentVariant()}>
          <Menu.Arrow className={menuArrowVariant()}>
            <Menu.ArrowTip className={menuArrowTipVariant()} />
          </Menu.Arrow>
          <div className="flex flex-col gap-1 w-full h-full">
            {SORTS.map((sort) => (
              <Menu.Item
                key={sort.value}
                value={sort.value}
                className={dropdownMenuItemVariants()}
              >
                {sort.label}
              </Menu.Item>
            ))}
          </div>
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root >
  )
}, "UsersFiltersSort")

export const { Component: UsersFiltersViewer,inViewAtom: usersFiltersInViewAtom } = createViewerModel({
  name: "users-filters",
  logging: true
})

export const UsersFilters = reatomComponent(({ ctx }) => {
  return (
    <div
      className="
        flex top-14 lg:top-1 z-10 group mb-4 flex-col w-full sticky gap-2 bg-neutral-900 rounded-xl duration-100 ease-in
        border data-[view=true]:border-transparent data-[view=false]:border-neutral-800 data-[view=false]:p-4
      "
      ref={el => {
        const un = ctx.subscribe(usersFiltersInViewAtom, (state) => {
          if (!el) return;
          el.dataset.view = state.toString()
        })

        return () => un()
      }}
    >
      <UsersFiltersLength />
      <div
        className="
          flex duration-100 ease-in opacity-100 flex-col min-w-0 sm:flex-row sm:items-center justify-between w-full gap-2 h-full
          group-data-[view=false]:h-0 group-data-[view=false]:opacity-0
        "
      >
        <div className="flex w-full sm:w-2/3">
          <UsersFiltersSearchQuery />
        </div>
        <div className="flex items-center min-w-0 gap-1 w-full sm:w-1/3">
          <UsersFiltersAsc />
          <UsersFiltersSort />
        </div>
      </div>
      <UsersFiltersSelect />
    </div>
  )
}, "UsersFilters")
