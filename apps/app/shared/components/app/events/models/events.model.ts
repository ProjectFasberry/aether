import { isEmptyArray } from "@/shared/lib/utils";
import { client, withAbort, withQueryParams } from "@/shared/lib/client-wrapper";
import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/async";
import { atom } from "@reatom/core";
import { EventPayload } from "@repo/shared/types/entities/other";

const eventsTypeAtom = atom<Maybe<string>>(undefined, "eventsType")

export async function getEvents(init: RequestInit, params: Partial<Record<string, string | number>>) {
  return client<EventPayload[]>("server/events/list")
    .pipe(withQueryParams(params), withAbort(init.signal))
    .exec()
}

export const eventsAction = reatomAsync(async (ctx) => {
  const params = {
    type: ctx.get(eventsTypeAtom),
    limit: 3
  }

  return await ctx.schedule(() => getEvents({ signal: ctx.controller.signal }, params))
}, "eventsAction").pipe(
  withDataAtom(null, (ctx, data) => isEmptyArray(data) ? null : data),
  withCache({ swr: false, staleTime: 1 * 60 * 1000 }),
  withStatusesAtom()
)