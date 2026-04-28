import { client, withQueryParams } from "@/shared/lib/client-wrapper";
import { atom } from "@reatom/core";
import { withAssign } from "@reatom/framework";
import { withSsr } from "@/shared/lib/reatom-helpers";

type EventPayloads = ExtractApiData<"getServerEventsList">["data"]

export async function getEvents(
  params: Partial<Record<string, string | number>>,
  init?: RequestInit
) {
  return client<EventPayloads>("server/events/list", init)
    .pipe(withQueryParams(params))
    .exec()
}

export const eventsState = atom(null, "eventsState").pipe(
  withAssign((_, name) => ({
    data: atom<EventPayloads>([], `${name}.data`).pipe(withSsr(`${name}.data`))
  }))
)