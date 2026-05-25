import { client, withQueryParams } from "@/shared/lib/client-wrapper";
import { atom } from "@reatom/framework";
import { withAssign } from "@reatom/framework";
import { withSsr } from "@/shared/models/ssr";

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