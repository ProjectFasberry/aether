import { reatomComponent, useUpdate } from "@reatom/npm-react"
import { tasks, tasksFilter, type TasksFilterSortBy } from "../models/tasks.model"
import { IconArrowDown, IconArrowUp, IconSearch } from "@tabler/icons-react"
import { Button } from "@/shared/ui/button"
import { Typography } from "@/shared/ui/typography"
import { Input } from "@/shared/ui/input"
import { Skeleton } from "@/shared/ui/skeleton"
import { tv } from "tailwind-variants"
import { type ReactNode } from "react"
import { belkoinImage, charismImage } from "@/shared/consts/images"
import { getStaticImage } from "@/shared/lib/volume-helpers"
import { PageLoader } from "@/shared/ui/page-loader"
import { Menu } from '@ark-ui/react/menu'
import { menuArrowTipVariant, menuArrowVariant, menuContentVariant } from "@/shared/ui/menu"

type TaskItemProps = ExtractApiData<"getServerTaskById">["data"];

const eventImage = getStaticImage("arts/looking.jpg")

const EventsNotFound = () => {
  return (
    <div className="flex w-full items-center justify-center h-full gap-12 px-12 py-6 relative">
      <div className="flex flex-col items-center gap-y-4">
        <img src={eventImage} alt="" width={256} height={256} />
        <Typography className="text-xl font-bold text-shark-50">
          Ивентов пока нет
        </Typography>
      </div>
    </div>
  )
}

const Currency = ({ type, value }: { type: string, value: number }) => {
  return (
    <div className="flex items-center gap-1">
      <img src={type === 'CHARISM' ? charismImage : belkoinImage} alt="" width={32} height={32} />
      <Typography className="text-base">{value}</Typography>
    </div>
  )
}

const ACTION: Record<string, (value: string) => ReactNode> = {
  "link": (value: string) => (
    <a href={value} target="_blank" rel="noreferrer">
      <Button background="white" className="w-full lg:w-fit h-10 font-semibold">
        Выполнить
      </Button>
    </a>
  )
}

const taskItemVariant = tv({
  base: `flex flex-col items-center justify-between gap-4 h-48 w-full rounded-lg p-4 border border-neutral-800`,
  slots: {
    firstGroup: "flex flex-col gap-1 justify-start w-full",
    secondGroup: "flex flex-col lg:flex-row lg:items-center lg:gap-2 gap-2 lg:justify-end w-full"
  }
})

const TaskItemSkeleton = () => {
  return (
    <div className={taskItemVariant().base()}>
      <div className={taskItemVariant().firstGroup()}>
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-6 w-3/4" />
      </div>
      <div className={taskItemVariant().secondGroup()}>
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-28" />
      </div>
    </div>
  )
}

const TaskItem = (
  { title, description, reward_value, action_type, action_value, reward_currency }: TaskItemProps
) => {
  const action = ACTION[action_type](action_value!)

  return (
    <div className={taskItemVariant().base()}>
      <div className={taskItemVariant().firstGroup()}>
        <Typography className="font-semibold text-lg truncate">
          {title}
        </Typography>
        <Typography color="gray" className="truncate">
          {description}
        </Typography>
      </div>
      <div className={taskItemVariant().secondGroup()}>
        {/* <Dialog>
          <DialogTrigger asChild>
            <Button background="default" className="w-full lg:w-fit h-10">
              <Typography className="text-base">
                Награда
              </Typography>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogTitle>Ивент: {title}</DialogTitle>
            <div className="flex flex-col gap-4 p-2 items-center justify-center w-full">
              <div className="flex flex-col gap-2 w-full">
                <Typography className="text-lg font-semibold">
                  Награда:
                </Typography>
                <Currency type={reward_currency} value={reward_value} />
              </div>
            </div>
          </DialogContent>
        </Dialog> */}
        {action}
      </div>
    </div>
  )
}

const TasksFilterSearch = reatomComponent(({ ctx }) => {
  return (
    <div
      className="flex items-center w-full lg:w-2/3 h-10 relative inert:pointer-events-none inert:opacity-70"
      inert={ctx.spy(tasks.fetch.statusesAtom).isPending}
    >
      <IconSearch
        size={20}
        className="text-neutral-400 absolute z-1 left-4"
      />
      <Input
        className="w-full h-10 pl-12"
        placeholder="Название"
        onChange={e => tasks.onChangeEvent(ctx, e)}
        value={ctx.spy(tasksFilter.searchQuery)}
        maxLength={1024}
      />
    </div>
  )
}, "TasksFilterSearch")

const TasksFilterType = reatomComponent(({ ctx }) => {
  return (
    <div>
      <Menu.Root onSelect={(details) => tasksFilter.sortBy(ctx, details.value as TasksFilterSortBy)}>
        <Menu.Trigger asChild>
          <Button
            background="default"
            className="
            w-full min-w-0 text-sm sm:text-base font-semibold text-nowrap truncate
          "
            disabled={ctx.spy(tasks.fetch.statusesAtom).isPending}
          >
            Сортировать по:&nbsp;<span className="text-neutral-400">Актуальности</span>
          </Button>
        </Menu.Trigger>
        <Menu.Positioner>
          <Menu.Content className={menuContentVariant({ className: "w-full min-w-56" })}>
            <Menu.Arrow className={menuArrowVariant()}>
              <Menu.ArrowTip className={menuArrowTipVariant()} />
            </Menu.Arrow>
            {tasksFilter.FILTERS.map((filter) => (
              <Button
                key={filter.value}
                onClick={() => tasksFilter.sortBy(ctx, filter.value as TasksFilterSortBy)}
                className="font-semibold w-full text-sm sm:text-base justify-start hover:bg-neutral-800"
              >
                {filter.title}
              </Button>
            ))}
          </Menu.Content>
        </Menu.Positioner>
      </Menu.Root>
    </div>
  )
}, "TasksFilterType")

const TasksFilterAsc = reatomComponent(({ ctx }) => {
  const asc = ctx.spy(tasksFilter.asc);

  return (
    <Button
      background="default"
      className="aspect-square h-10 w-10 p-0 text-neutral-400"
      onClick={() => tasksFilter.asc(ctx, (state) => !state)}
      disabled={ctx.spy(tasks.fetch.statusesAtom).isPending}
    >
      {asc ? <IconArrowUp size={20} /> : <IconArrowDown size={20} />}
    </Button>
  )
}, "TasksFilterAsc")

export const TasksFilter = () => {
  return (
    <div className="flex lg:flex-nowrap flex-wrap items-center gap-2 w-full">
      <TasksFilterSearch />
      <div className="flex items-center gap-2 w-full lg:w-1/3">
        <TasksFilterType />
        <TasksFilterAsc />
      </div>
    </div>
  )
}

export const Tasks = reatomComponent(({ ctx }) => {
  useUpdate(tasks.fetch, [])

  if (ctx.spy(tasks.fetch.statusesAtom).isPending) return <PageLoader />

  const data = ctx.spy(tasks.fetch.dataAtom)?.data;
  const error = ctx.spy(tasks.fetch.errorAtom)

  if (error) {
    return <span className="text-red">{error.message}</span>
  }

  if (!data) return <EventsNotFound />

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-3 auto-rows-auto gap-4 w-full">
      {data.map((task) => <TaskItem key={task.id} {...task} />)}
    </div>
  )
}, "Tasks")