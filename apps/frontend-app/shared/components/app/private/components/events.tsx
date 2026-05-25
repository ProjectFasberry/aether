import { reatomComponent, useUpdate } from "@reatom/npm-react"
import { Input } from "@/shared/ui/input"
import { createEvent, createEventState, deleteEvent, events } from "../models/event.model"
import { type AtomState } from "@reatom/framework"
import { type ReactNode } from "react"
import { Typography } from "@/shared/ui/typography"
import { DeleteButton } from "./ui"
import { actionsTypeAtom, getSelectedParentAtom } from "../models/actions.model"
import { ButtonXSubmit, ToActionButtonX } from "./global"

const CreateEventTitle = reatomComponent(({ ctx }) => {
  return (
    <Input
      value={ctx.spy(createEventState.title)}
      onChange={e => createEventState.title(ctx, e.target.value)}
      placeholder="Заголовок"
    />
  )
}, "CreateEventTitle")
const CreateEventType = reatomComponent(({ ctx }) => {
  return (
    <Input
      value={ctx.spy(createEventState.type)}
      onChange={e => createEventState.type(ctx, e.target.value)}
      placeholder="Тип"
    />
  )
}, "CreateEventType")
const CreateEventDesc = reatomComponent(({ ctx }) => {
  return (
    <Input
      value={ctx.spy(createEventState.description)}
      onChange={e => createEventState.description(ctx, e.target.value)}
      placeholder="Описание"
    />
  )
}, "CreateEventDesc")
const CreateEventInitiator = reatomComponent(({ ctx }) => {
  return (
    <Input
      value={ctx.spy(createEventState.initiator)}
      onChange={e => createEventState.initiator(ctx, e.target.value)}
      placeholder="Инициатор"
    />
  )
}, "CreateEventInitiator")
const CreateEventSubmit = reatomComponent(({ ctx }) => {
  return (
    <ButtonXSubmit
      title="Создать"
      action={() => createEvent.submit(ctx)}
      isDisabled={ctx.spy(createEvent.submit.statusesAtom).isPending}
    />
  )
}, "CreateEventSubmit")
const CreateEventForm = () => {
  return (
    <div className="flex flex-col gap-2 w-full h-full">
      <CreateEventType />
      <CreateEventTitle />
      <CreateEventDesc />
      <CreateEventInitiator />
    </div>
  )
}

const EventsList = reatomComponent(({ ctx }) => {
  useUpdate(events.fetch, [])

  if (ctx.spy(events.fetch.statusesAtom).isPending) return null;
  
  const data = ctx.spy(events.fetch.dataAtom)
  if (!data) return null;

  return (
    <div className="flex flex-col w-full gap-2 h-full">
      {data.map((event) => (
        <div
          key={event.id}
          className="flex items-center justify-between gap-1 rounded-lg border border-neutral-800 w-full p-2"
        >
          <div className="flex items-center gap-2">
            <Typography className="text-neutral-400">
              [{event.title}]
            </Typography>
            <Typography className="truncate">
              {event.content.description}
            </Typography>
          </div>
          <div className="flex items-center gap-1">
            <DeleteButton
              disabled={ctx.spy(deleteEvent.submit.statusesAtom).isPending}
              onClick={() => deleteEvent.submit(ctx)}
            />
          </div>
        </div>
      ))}
    </div>
  )
}, "EventsList")

const VARIANTS: Record<AtomState<typeof actionsTypeAtom>, ReactNode> = {
  "create": <CreateEventForm />,
  "edit": null,
  "view": <EventsList />
}

export const EventsWrapper = reatomComponent(({ ctx }) => {
  if (!ctx.spy(getSelectedParentAtom("event"))) {
    return VARIANTS["view"]
  }

  return VARIANTS[ctx.spy(actionsTypeAtom)]
}, "EventsWrapper")

export const ViewEvent = () => <ToActionButtonX title="Создать" parent="event" type="create" />;

export const CreateEvent = () => {
  return (
    <div className="flex items-center gap-1">
      <ToActionButtonX parent="event" type="create" />
      <CreateEventSubmit />
    </div>
  )
}