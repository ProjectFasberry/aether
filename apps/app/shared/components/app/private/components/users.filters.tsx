import { atom } from "@reatom/framework";
import { reatomComponent, useUpdate } from "@reatom/npm-react";
import { useInView } from "react-intersection-observer";
import { UserActionsChangeRoleGlobal } from "./users.change-role";
import { users, usersState, usersLengthAtom, usersSelectedLengthAtom, usersSelectedOverAtom, usersControl, usersControlState } from "../models/users.model";
import { Skeleton } from "@repo/ui/skeleton";
import { Button } from "@repo/ui/button";
import { IconArrowDown, IconArrowUp, IconBan } from "@tabler/icons-react";
import { Checkbox } from "@repo/ui/checkbox";
import { Input } from "@repo/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@repo/ui/dropdown-menu";
import { UserActionsWrapper } from "./users.restrict";

const UsersGlobalActions = reatomComponent(({ ctx }) => {
  const isSelectedOver = ctx.spy(usersSelectedOverAtom);
  if (!isSelectedOver) return null;

  return (
    <div className="flex items-center justify-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center justify-center h-8 w-8 aspect-square bg-neutral-800 rounded-md">
          <IconBan size={16} />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <UserActionsWrapper type="global" />
        </DropdownMenuContent>
      </DropdownMenu>
      <UserActionsChangeRoleGlobal />
    </div>
  )
}, "UsersGlobalActions")

const UsersSelectedLength = reatomComponent(({ ctx }) => {
  if (!ctx.spy(usersSelectedOverAtom)) return null;

  const data = ctx.spy(usersSelectedLengthAtom)
  if (data < 2) return null;

  return data
}, "UsersSelectedLength")

const UsersFiltersLength = reatomComponent(({ ctx }) => {
  return (
    <div className="flex items-center gap-4 w-full text-neutral-400 text-sm">
      <div className="flex text-sm items-center gap-1">
        Показано:&nbsp;
        {ctx.spy(users.fetch.statusesAtom).isPending ? <Skeleton className="h-5 w-5" /> : ctx.spy(usersLengthAtom)}
      </div>
      <div className="flex text-sm items-center gap-1">
        Выбрано:&nbsp;<UsersSelectedLength />
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
  const isChecked = ctx.spy(usersControlState.isCheckedAll)

  return (
    <div className="flex justify-between h-10 px-4 w-full items-center">
      <div className="flex items-center gap-2">
        <Checkbox
          id="users-filter-selectAll"
          checked={isChecked}
          onCheckedChange={(v) => typeof v === 'boolean' && usersControl.selectAll(ctx, v)}
        />
        <label htmlFor="users-filter-selectAll">Выбрать все</label>
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
  { title: "По дате регистрации", value: "created_at" },
  { title: "По роли", value: "role" },
  { title: "По алфавиту", value: "abc" }
] as const

const UsersFiltersSort = reatomComponent(({ ctx }) => {
  const currentSort = ctx.spy(usersState.filters.sortBy);
  const targetSort = SORTS.find(d => d.value === currentSort)?.title
  if (!targetSort) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="px-4 h-8 w-full text-nowrap truncate min-w-0" background="default">
          {targetSort}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="flex flex-col gap-1 w-full h-full">
        {SORTS.map((sort) => (
          <DropdownMenuItem
            key={sort.value}
            className="flex items-center px-2 py-1 justify-start w-full h-10"
            onClick={() => usersState.filters.sortBy(ctx, sort.value)}
          >
            {sort.title}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}, "UsersFiltersSort")

const usersFiltersInViewAtom = atom(true)

export const UsersFiltersViewer = () => {
  const { ref, inView } = useInView()
  useUpdate((ctx) => usersFiltersInViewAtom(ctx, inView), [inView])
  return <div ref={ref} className="h-1px w-full" />
}

export const UsersFilters = reatomComponent(({ ctx }) => {
  const inView = ctx.spy(usersFiltersInViewAtom)

  return (
    <div
      className="flex flex-col w-full gap-2 rounded-lg border p-4 top-1
        data-[state=true]:relative 
        data-[state=true]:bg-transparent
        data-[state=true]:border-transparent 
      data-[state=false]:bg-neutral-900
      data-[state=false]:border-neutral-800 
        data-[state=false]:z-50
        data-[state=false]:sticky
      "
      data-state={inView}
    >
      <UsersFiltersLength />
      {inView && (
        <div className="flex flex-col min-w-0 sm:flex-row sm:items-center justify-between w-full gap-2 h-full">
          <div className="flex w-full sm:w-2/3">
            <UsersFiltersSearchQuery />
          </div>
          <div className="flex items-center min-w-0 gap-1 w-full sm:w-1/3">
            <UsersFiltersAsc />
            <UsersFiltersSort />
          </div>
        </div>
      )}
      <UsersFiltersSelect />
    </div>
  )
}, "UsersFilters")