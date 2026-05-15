import { client } from "@/shared/lib/client-wrapper";
import { action, atom, reatomAsync, reatomMap, sleep, withAssign, withDataAtom, withReset, withStatusesAtom } from "@reatom/framework";

export type HistoryPayload = {
  event: string; id: number; created_at: Date; initiator: string;
}

export const historyState = atom(null, "_historyState").pipe(
  withAssign((_, name) => ({
    es: atom<EventSource | null>(null, `${name}.es`).pipe(withReset()),
    itemsStatuses: reatomMap<number, { loaded: boolean }>(new Map(), `${name}.itemsStatuses`)
  }))
)
export const history = atom(null, "_history").pipe(
  withAssign((_, name) => ({
    fetch: reatomAsync(async (ctx) => {
      return await ctx.schedule(() =>
        client<HistoryPayload[]>("privated/history/list").exec()
      )
    }, `${name}.fetch`).pipe(
      withDataAtom(),
      withStatusesAtom()
    ),
    reload: action(async (ctx, id: number) => {
      await ctx.schedule(() => sleep(2000))
      historyState.itemsStatuses.delete(ctx, id)
    }, `${name}.reload`)
  }))
)

historyState.itemsStatuses.onChange((ctx, state) => {
  if (!state) return;

  const first = state.entries().next().value;
  if (!first) return;

  history.reload(ctx, first[0])
})

historyState.es.onChange((ctx, state) => {
  if (!state) return;

  state.onopen = () => { }

  state.addEventListener("config", (event) => { })
  state.addEventListener("ping", (event) => { })
  state.addEventListener("payload", (event) => {
    try {
      const msg = JSON.parse(event.data) as HistoryPayload

      history.fetch.dataAtom(ctx, (state) => state ? [msg, ...state] : [msg])
      historyState.itemsStatuses.getOrCreate(ctx, msg.id, () => ({ loaded: true }))

    } catch (e) {
      console.error('Failed to parse message data:', e);
    }
  })
})

export const getHistoryItemStatusAtom = (id: number) => atom((ctx) => ctx.spy(historyState.itemsStatuses).get(id)?.loaded ?? false)
