import { Data } from "./+data";
import { useUpdate } from "@reatom/npm-react";
import { order, orderState } from "@/shared/components/app/shop/models/store-order.model";
import { action } from "@reatom/framework";
import { pageCtxAtom } from "@/shared/models/page-context.model";
import { startPageEvents } from "@/shared/lib/events";
import { useData } from "vike-react/useData";
import { GameOrder } from "@/shared/components/app/shop/components/order/components/game-order";
import { OrderSingleDefault } from "@repo/shared/types/entities/store";
import { DefaultOrder } from "@/shared/components/app/shop/components/order/components/default-order";

const events = action((ctx) => {
  const pageContext = ctx.get(pageCtxAtom);
  if (!pageContext) return;

  const { data } = pageContext.data as { data: OrderSingleDefault }
  const uniqueId = pageContext.routeParams.id;

  orderState.data(ctx, data)
  order.connect(ctx, uniqueId)
}, "events")

export default function Page() {
  const { type } = useData<Data>().data;

  useUpdate((ctx) => {
    if (type === 'default') {
      startPageEvents(ctx, events, { urlTarget: "order" })
    }
  }, [pageCtxAtom])

  const component = type === 'game' ? <GameOrder /> : type === 'default' ? <DefaultOrder /> : null
  return component
}