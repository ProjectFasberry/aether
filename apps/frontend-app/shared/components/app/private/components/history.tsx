import { PageLoader } from "@/shared/ui/page-loader";
import { reatomComponent } from "@reatom/npm-react";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/table"
import { tv } from "tailwind-variants";
import { getHistoryItemStatusAtom, history, type HistoryPayload } from "../models/history.model";
import { getFromDictionary } from "@/shared/models/app/utils";
import dayjs from "@/shared/lib/create-dayjs";

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

export const HistoryList = reatomComponent(({ ctx }) => {
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
