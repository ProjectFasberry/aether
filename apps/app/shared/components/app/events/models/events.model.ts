import { client, withQueryParams } from "@/shared/lib/client-wrapper";
import { atom } from "@reatom/core";
import { EventPayload } from "@repo/shared/types/entities/other";
import { withAssign } from "@reatom/framework";
import { withSsr } from "@/shared/lib/reatom-helpers";

export async function getEvents(
  params: Partial<Record<string, string | number>>,
  init?: RequestInit
) {
  return client<EventPayload[]>("server/events/list", init)
    .pipe(withQueryParams(params))
    .exec()
}

export const eventsState = atom(null, "eventsState").pipe(
  withAssign((_, name) => ({
    data: atom<EventPayload[]>([], `${name}.data`).pipe(withSsr(`${name}.data`))
  }))
)