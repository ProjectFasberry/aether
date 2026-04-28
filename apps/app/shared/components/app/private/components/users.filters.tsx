import { atom } from "@reatom/core";
import { reatomComponent, useUpdate } from "@reatom/npm-react";
import { useInView } from "react-intersection-observer";
import { UserActionsRestrictGlobal } from "./users.restrict";
import { UserActionsChangeRoleGlobal } from "./users.change-role";
import {
  isCheckedAllAtom,
  selectAllAction,
  updateSearchQueryAction,
  usersAction,
  usersAscendingAtom,
  usersLengthAtom,
  usersSearchQueryAtom,
  usersSelectedLengthAtom,
  usersSelectedOverAtom,
  usersSortAtom
} from "../models/users.model";
import { Typography } from "@repo/ui/typography";
import { Skeleton } from "@repo/ui/skeleton";
import { Button } from "@repo/ui/button";
import { IconArrowDown, IconArrowUp } from "@tabler/icons-react";
import { Checkbox } from "@repo/ui/checkbox";
import { Input } from "@repo/ui/input";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@repo/ui/hover-card";

const UsersGlobalActions = reatomComponent(({ ctx }) => {
  const isSelectedOver = ctx.spy(usersSelectedOverAtom);
  if (!isSelectedOver) return null;

  return (
    <div className="flex items-center justify-center gap-1">
      <UserActionsRestrictGlobal />
      <UserActionsChangeRoleGlobal />
    </div>
  )
}, "UsersGlobalActions")

const UsersSelectedLength = reatomComponent(({ ctx }) => {
  if (!ctx.spy(usersSelectedOverAtom)) return null;

  const data = ctx.spy(usersSelectedLengthAtom)
  if (data < 2) return null;

  return (
    <div className="flex items-center gap-1">
      <Typography>
        Выбрано:
      </Typography>
      {data}
    </div>
  )
}, "UsersSelectedLength")

const UsersFiltersLength = reatomComponent(({ ctx }) => {
  const isLoading = ctx.spy(usersAction.statusesAtom).isPending;

  return (
    <div className="flex items-center gap-4 w-full">
      <div className="flex items-center gap-1">
        <Typography>
          Показано:
        </Typography>
        {isLoading ? <Skeleton className="h-5 w-5" /> : (
          <Typography>
            {ctx.spy(usersLengthAtom)}
          </Typography>
        )}
      </div>
      <UsersSelectedLength />
    </div>
  )
}, "UsersFiltersLength")

const UsersFiltersAsc = reatomComponent(({ ctx }) => {
  return (
    <Button
      className="h-8 w-8 aspect-square p-1 bg-neutral-800"
      onClick={() => usersAscendingAtom(ctx, (state) => !state)}
    >
      {ctx.spy(usersAscendingAtom) ? <IconArrowUp /> : <IconArrowDown />}
    </Button>
  )
}, 'UsersFiltersAsc')

const UsersFiltersSelect = reatomComponent(({ ctx }) => {
  const isChecked = ctx.spy(isCheckedAllAtom)

  return (
    <div className="flex justify-between h-10 w-full items-center">
      <div className="flex items-center px-4 gap-2 w-full">
        <Checkbox
          checked={isChecked}
          onCheckedChange={(v) => {
            if (typeof v === 'boolean') {
              selectAllAction(ctx, v)
            }
          }}
        />
        <Typography
          className="cursor-pointer"
          onClick={() => selectAllAction(ctx, !isChecked)}
        >
          Выбрать все
        </Typography>
      </div>
      <UsersGlobalActions />
    </div>
  )
}, "UsersFiltersSelect")

const UsersFiltersSearchQuery = reatomComponent(({ ctx }) => {
  return (
    <Input
      value={ctx.spy(usersSearchQueryAtom) ?? ""}
      onChange={e => updateSearchQueryAction(ctx, e)}
      placeholder="Поиск по никнейму"
      maxLength={32}
      className="w-full sm:w-fit"
    />
  )
}, "UsersFiltersSearchQuery")

const SORTS = [
  { title: "По дате регистрации", value: "created_at" },
  { title: "По роли", value: "role" },
  { title: "По алфавиту", value: "abc" }
] as const

const UsersFiltersSort = reatomComponent(({ ctx }) => {
  const currentSort = ctx.spy(usersSortAtom);
  const targetSort = SORTS.find(d => d.value === currentSort)?.title

  if (!targetSort) return null;

  return (
    <div>
      <HoverCard>
        <HoverCardTrigger className="cursor-pointer bg-neutral-800 rounded-md h-8 px-4">
          {targetSort}
        </HoverCardTrigger>
        <HoverCardContent>
          <div className="flex flex-col gap-1 w-full h-full">
            {SORTS.map((sort) => (
              <div
                key={sort.value}
                className="flex cursor-pointer hover:bg-neutral-700 items-center px-2 py-1 justify-start w-full h-10 bg-neutral-800 rounded-lg"
                onClick={() => usersSortAtom(ctx, sort.value)}
              >
                <div className="flex">
                  {sort.title}
                </div>
              </div>
            ))}
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  )
}, "UsersFiltersSort")

const usersFiltersInViewAtom = atom(true)

export const UsersFiltersViewer = reatomComponent(({ ctx }) => {
  const { ref, inView } = useInView()
  useUpdate((ctx) => usersFiltersInViewAtom(ctx, inView), [inView])
  return <div ref={ref} className="h-1px w-full" />
}, "UsersFiltersViewer")

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
        data-[state=false]:z-20 
        data-[state=false]:sticky
      "
      data-state={inView}
    >
      <div className="flex items-center justify-start text-neutral-400 text-sm">
        <UsersFiltersLength />
      </div>
      {inView && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-1 h-full">
          <div className="flex grow">
            <UsersFiltersSearchQuery />
          </div>
          <div className="flex justify-end sm:justify-start items-center gap-1 w-full sm:w-fit">
            <UsersFiltersAsc />
            <UsersFiltersSort />
          </div>
        </div>
      )}
      <UsersFiltersSelect />
    </div>
  )
}, "UsersFilters")