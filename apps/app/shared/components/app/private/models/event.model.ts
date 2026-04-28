import { action, atom } from "@reatom/core"
import { reatomAsync, withAssign, withCache, withDataAtom, withReset, withStatusesAtom } from "@reatom/framework"
import { getEvents } from "../../events/models/events.model"
import { client, withJsonBody } from "@/shared/lib/client-wrapper"
import { toast } from "sonner"
import { logError } from "@/shared/lib/log"
import { notifyAboutRestrictRole } from "./actions.model"

type EventPayload = ExtractApiData<"getServerEventsList">["data"][number]

export const eventsListAction = reatomAsync(async (ctx) => {
  return await ctx.schedule(() =>
    getEvents({ limit: 12 }, { signal: ctx.controller.signal })
  )
}).pipe(
  withDataAtom(null),
  withCache({ swr: false }),
  withStatusesAtom()
)

export const createEventTitleAtom = atom("", "createEventTitle").pipe(withReset())
export const createEventDescriptionAtom = atom("", "createEventDescription").pipe(withReset())
export const createEventInitiatorAtom = atom("", "createEventInitiator").pipe(withReset())
export const createEventTypeAtom = atom("", "createEventType").pipe(withReset())

export const createEvent = atom(null, "createEvent").pipe(
  withAssign((ctx, name) => ({
    resetFull: action((ctx) => {
      createEventTitleAtom.reset(ctx)
      createEventDescriptionAtom.reset(ctx)
      createEventInitiatorAtom.reset(ctx)
      createEventTypeAtom.reset(ctx)
    }, `${name}.createEvent`)
  }))
)

export const createEventAction = reatomAsync(async (ctx) => {
  const json = {
    title: ctx.get(createEventTitleAtom),
    description: ctx.get(createEventDescriptionAtom),
    initiator: ctx.get(createEventInitiatorAtom),
    type: ctx.get(createEventTypeAtom)
  }

  return await client
    .post<EventPayload>("privated/events/create", { throwHttpErrors: false })
    .pipe(withJsonBody(json))
    .exec()
}, {
  name: "createEventAction",
  onFulfill: (ctx, res) => {
    toast.success("Ивент создан");

    eventsListAction.cacheAtom.reset(ctx)
    eventsListAction.dataAtom(ctx, (state) => state ? [...state, res] : null)

    createEvent.resetFull(ctx)
  },
  onReject: (ctx, e) => {
    notifyAboutRestrictRole(e)
    logError(e)
  },
}).pipe(withStatusesAtom())