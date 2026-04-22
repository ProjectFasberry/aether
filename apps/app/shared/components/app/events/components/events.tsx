import dayjs from "@/shared/lib/create-dayjs"
import { reatomComponent } from "@reatom/npm-react";
import { Typography } from "@repo/ui/typography";
import { eventsAction } from "../models/events.model";
import { Skeleton } from "@repo/ui/skeleton";
import { AtomState, onConnect } from "@reatom/framework";
import { NotFound } from "@/shared/ui/not-found";
import { isClientAtom } from "@/shared/models/page-context.model";
import { scrollableVariant } from "@/shared/consts/style-variants";
import { tv } from "tailwind-variants";

const EventsSkeleton = () => {
  return (
    <>
      <EventCardSkeleton />
      <EventCardSkeleton />
      <EventCardSkeleton />
    </>
  )
}

onConnect(eventsAction, eventsAction)

type EventCardProps = NonNullable<AtomState<typeof eventsAction.dataAtom>>[number]

const eventCardVariant = tv({
  base: `
    flex flex-col md:flex-[0_0_calc((100%/3)-0.666rem)] flex-shrink-0 w-full
    h-48 p-2 sm:p-4 bg-neutral-900 rounded-xl overflow-hidden justify-between
  `,
  slots: {
    firstGroup: "flex items-center justify-start bg-neutral-50 rounded-md p-2 w-full truncate",
    secondGroup: "flex flex-col justify-between h-full mt-2"
  }
})

const EventCardSkeleton = () => {
  return (
    <div
      className={eventCardVariant().base()}
    >
      <div className={eventCardVariant().firstGroup()}>
        <Skeleton className="h-6 w-24" />
      </div>
      <div className={eventCardVariant().secondGroup()}>
        <Skeleton className="h-6 w-16" />
        <div className="flex flex-col justify-center items-end w-full">
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
    </div>
  )
}

const EventCard = ({ content, id, title }: EventCardProps) => {
  const created_at = dayjs(content.created_at).fromNow();
  
  return (
    <div
      id={id}
      className={eventCardVariant().base()}
    >
      <div className={eventCardVariant().firstGroup()}>
        <Typography className="text-neutral-950 text-base font-bold truncate">
          {title}
        </Typography>
      </div>
      <div className={eventCardVariant().secondGroup()}>
        {content.description && (
          <Typography className="text-base line-clamp-3">
            {content.description}
          </Typography>
        )}
        <div className="flex flex-col justify-center items-end w-full">
          <Typography color="gray" className="text-sm">
            {created_at}
          </Typography>
        </div>
      </div>
    </div>
  )
}

const EventsList = reatomComponent(({ ctx }) => {
  if (!ctx.spy(isClientAtom)  || ctx.spy(eventsAction.statusesAtom).isPending) {
    return <EventsSkeleton />
  }
  
  const data = ctx.spy(eventsAction.dataAtom)
  if (!data) return <NotFound title="Ивентов нет" />

  return data.map(event => <EventCard key={event.id} {...event}/>)
}, "EventsList")

export const Events = () => {
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <Typography className="text-3xl font-bold">
        Последние события
      </Typography>
      <div className={scrollableVariant({ className: "flex scrollbar-h-2 overflow-x-auto gap-4 pb-2" })}>
        <EventsList />
      </div>
    </div>
  )
}