import dayjs from "@/shared/lib/create-dayjs"
import { client } from "@/shared/lib/client-wrapper"
import { reatomAsync, withDataAtom, withStatusesAtom } from "@reatom/framework"
import { reatomComponent, useAtom, useUpdate } from "@reatom/npm-react"
import { Skeleton } from "@repo/ui/skeleton"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/table"
import { action, atom } from "@reatom/framework"
import { env } from "@/shared/env"
import { toast } from "sonner"
import { reatomMap, sleep, withReset } from "@reatom/framework"
import { onDisconnect } from "@reatom/framework"
import { tv } from "tailwind-variants"
import { getFromDictionary } from "@/shared/models/app/base.model"
import { createPageModel } from "@/shared/lib/events"

type HistoryPayload = {
  event: string;
  id: number;
  created_at: Date;
  initiator: string;
}

const esAtom = atom<EventSource | null>(null, "").pipe(withReset())
const historyItemsStatusesAtom = reatomMap<number, { loaded: boolean }>()

historyItemsStatusesAtom.onChange((ctx, v) => console.log("historyItemsStatusesAtom", v))

const reLoadAction = action(async (ctx, id: number) => {
  await ctx.schedule(() => sleep(2000))
  historyItemsStatusesAtom.delete(ctx, id)
}, "reLoadAction")

historyItemsStatusesAtom.onChange((ctx, state) => {
  if (!state) return;

  const first = state.entries().next().value;

  if (first) {
    const [id, state] = first;
    reLoadAction(ctx, id)
  }
})

esAtom.onChange((ctx, state) => {
  if (!state) return;

  state.onopen = () => {
    if (import.meta.env.DEV) {
      toast.success("Connected to history events")
    }
  }

  state.addEventListener("config", (event) => {})
  state.addEventListener("ping", (event) => {})

  state.addEventListener("payload", (event) => {
    try {
      const msg = JSON.parse(event.data) as HistoryPayload

      historyListAction.dataAtom(ctx, (state) => state ? [msg, ...state] : [msg])
      historyItemsStatusesAtom.getOrCreate(ctx, msg.id, () => ({ loaded: true }))

    } catch (e) {
      console.error('Failed to parse message data:', event.data, e);
    }
  })
})

onDisconnect(esAtom, (ctx) => {
  const source = ctx.get(esAtom);
  if (!source) return;

  source.close()
  esAtom.reset(ctx)
})

const historyListAction = reatomAsync(async (ctx) => {
  return await ctx.schedule(() =>
    client<HistoryPayload[]>("privated/history/list").exec()
  )
}).pipe(withDataAtom(), withStatusesAtom())

const historyListItemVariant = tv({
  base: ``,
  variants: {
    variant: {
      default: "",
      selected: "animate-[flash_2s_ease-out_forwards] w-full"
    }
  }
})

const getHistoryItemStatusAtom = (id: number) => atom(
  (ctx) => ctx.spy(historyItemsStatusesAtom).get(id)?.loaded ?? false,
  "getHistoryItemStatus"
)

const HistoryListItem = reatomComponent<HistoryPayload & { idx: number }>(({ 
  ctx, id, idx, initiator, event, created_at 
}) => {
  const isLoaded = ctx.spy(getHistoryItemStatusAtom(id));

  const variant = isLoaded ? "selected" : "default"
  const eventTitle = getFromDictionary(ctx, event)

  return (
    <TableRow className={historyListItemVariant({ variant })}>
      <TableCell className="font-medium">{idx + 1}</TableCell>
      <TableCell>
        {initiator}
      </TableCell>
      <TableCell title={event}>
        {eventTitle}
      </TableCell>
      <TableHead className="text-right">
        {dayjs(created_at).format("DD.MM.YYYY hh:mm")}
      </TableHead>
    </TableRow>
  )
}, "HistoryListItem")

const HistoryListSkeleton = () => {
  return (
    <>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </>
  )
}

const HistoryList = reatomComponent(({ ctx }) => {
  useUpdate(historyListAction, []);

  const data = ctx.spy(historyListAction.dataAtom);

  if (ctx.spy(historyListAction.statusesAtom).isPending) {
    return <HistoryListSkeleton />
  }

  if (!data) return null;

  return (
    <Table>
      <TableCaption>История</TableCaption>
      <TableHeader>
        <TableRow className="*:font-semibold *:text-base">
          <TableHead className="w-[64px]">#</TableHead>
          <TableHead>Инициатор</TableHead>
          <TableHead>Ивент</TableHead>
          <TableHead className="text-right">Дата</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item, idx) => (
          <HistoryListItem key={item.id} {...item} idx={idx} />
        ))}
      </TableBody>
    </Table>
  )
}, "HistoryList")

const page = createPageModel({
  name: "private.history",
  onConnAction: (ctx, dataAtom) => {
    const es = new EventSource(`${env.VITE_API_URL}/privated/history/events`, { withCredentials: true })
    if (!es) return;

    const current = ctx.get(esAtom)

    if (current) {
      toast.info("Current es atom defined")
      current.close()
      esAtom(ctx, es)
      return
    }

    esAtom(ctx, es)
  }
})

export default function Page() {
  const [_] = useAtom(page.dataAtom)

  return (
    <div className="bg-neutral-900 rounded-xl p-4">
      <HistoryList />
    </div>
  )
}