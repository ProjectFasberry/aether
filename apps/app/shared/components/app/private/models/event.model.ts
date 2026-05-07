import { action, atom } from "@reatom/framework"
import { reatomAsync, withAssign, withCache, withDataAtom, withReset, withStatusesAtom } from "@reatom/framework"
import { getEvents } from "../../events/models/events.model"
import { client, withJsonBody } from "@/shared/lib/client-wrapper"
import { toast } from "sonner"
import { notifyAboutRestrictRole } from "./actions.model"

type EventPayload = ExtractApiData<"getServerEventsList">["data"][number]

export const events = atom(null, "events").pipe(
  withAssign(() => ({
    fetch: reatomAsync(async (ctx) => {
      return await ctx.schedule(() =>
        getEvents({ limit: 12 }, { signal: ctx.controller.signal })
      )
    }).pipe(
      withDataAtom(null),
      withCache({ swr: false }),
      withStatusesAtom()
    )
  }))
)

export const createEventState = atom(null, "createEventState").pipe(
  withAssign(() => ({
    title: atom("", "createEventTitle").pipe(withReset()),
    description: atom("", "createEventDescription").pipe(withReset()),
    initiator: atom("", "createEventInitiator").pipe(withReset()),
    type: atom("", "createEventType").pipe(withReset())
  }))
)
export const createEvent = atom(null, "createEvent").pipe(
  withAssign((_, name) => ({
    resetFull: action((ctx) => {
      createEventState.title.reset(ctx)
      createEventState.description.reset(ctx)
      createEventState.initiator.reset(ctx)
      createEventState.type.reset(ctx)
    }),
    submit: reatomAsync(async (ctx) => {
      const json = {
        title: ctx.get(createEventState.title),
        description: ctx.get(createEventState.description),
        initiator: ctx.get(createEventState.initiator),
        type: ctx.get(createEventState.type)
      }

      return await client
        .post<EventPayload>("privated/events/create", { throwHttpErrors: false })
        .pipe(withJsonBody(json))
        .exec()
    }, {
      name: `${name}.submit`,
      onFulfill: (ctx, res) => {
        toast.success("Ивент создан");

        events.fetch.cacheAtom.reset(ctx)
        events.fetch.dataAtom(ctx, (state) => state ? [...state, res] : null)

        createEvent.resetFull(ctx)
      },
      onReject: (_, e) => notifyAboutRestrictRole(e),
    }).pipe(withStatusesAtom())
  }))
)
export const deleteEvent = atom(null, "deleteEvent").pipe(
  withAssign((_, name) => ({
    submit: reatomAsync(async (ctx) => {

    }, {
      name: `${name}.submit`
    }).pipe(withStatusesAtom())
  }))
)