import dayjs from "@/shared/lib/create-dayjs"
import { reatomComponent, useAtom } from "@reatom/npm-react"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/table"
import { tv } from "tailwind-variants"
import { getFromDictionary } from "@/shared/models/app/utils"
import { createPageModel } from "@/shared/lib/events"
import { PageLoader } from "@/shared/ui/page-loader"
import { createEs } from "@/shared/lib/utils"
import { getHistoryItemStatusAtom, history, historyState, type HistoryPayload } from "@/shared/components/app/private/models/history.model"

const historyListItemVariant = tv({
  base: ``,
  variants: {
    variant: {
      default: "", selected: "animate-[flash_2s_ease-out_forwards] w-full"
    }
  }
})

const HistoryListItem = reatomComponent<HistoryPayload & { idx: number }>(({
  ctx, id, idx, initiator, event, created_at
}) => {
  const isLoaded = ctx.spy(getHistoryItemStatusAtom(id));

  const variant = isLoaded ? "selected" : "default"
  const eventTitle = getFromDictionary(ctx, event)

  return (
    <TableRow className={historyListItemVariant({ variant })}>
      <TableCell className="font-medium">{idx + 1}</TableCell>
      <TableCell>{initiator}</TableCell>
      <TableCell title={event}>{eventTitle}</TableCell>
      <TableHead className="text-right">
        {dayjs(created_at).format("DD.MM.YYYY hh:mm")}
      </TableHead>
    </TableRow>
  )
}, "HistoryListItem")

const HistoryList = reatomComponent(({ ctx }) => {
  if (ctx.spy(history.fetch.statusesAtom).isPending) return <PageLoader />

  const data = ctx.spy(history.fetch.dataAtom);
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
        {data.map((item, idx) => <HistoryListItem key={item.id} {...item} idx={idx} />)}
      </TableBody>
    </Table>
  )
}, "HistoryList")

const page = createPageModel({
  name: "private.history",
  onConnAction: (ctx) => {
    history.fetch(ctx);

    const es = createEs("privated/history/events", { withCredentials: true })
    const current = ctx.get(historyState.es)

    if (current) {
      current.close()
      historyState.es(ctx, es)
      return
    }

    historyState.es(ctx, es)
  },
  onDisconnAction: (ctx) => {
    const source = ctx.get(historyState.es);
    if (!source) return;

    source.close()
    historyState.es.reset(ctx)
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