import { Data } from "./+data";
import { useAtom } from "@reatom/npm-react";
import { order, orderState } from "@/shared/components/app/shop/models/store-order.model";
import { pageCtxAtom } from "@/shared/models/page-context.model";
import { useData } from "vike-react/useData";
import { GameOrder } from "@/shared/components/app/shop/components/order/components/game-order";
import { OrderSingleDefault } from "@repo/shared/types/entities/store";
import { DefaultOrder } from "@/shared/components/app/shop/components/order/components/default-order";
import { createPageModel } from "@/shared/lib/events";

const page = createPageModel({
  name: "order",
  onSpyAction: (ctx, dataAtom, pageCtx) => {
    if (!pageCtx) return;

    const { data } = pageCtx.data as { data: OrderSingleDefault }
    const type = data.type
    
    if (type === 'default') {
      const uniqueId = pageCtx.routeParams.id;
      orderState.data(ctx, data)
      order.connect(ctx, uniqueId)
    }
  },
  spyedAtom: pageCtxAtom
})

export default function Page() {
  const { type } = useData<Data>().data;
  const [_] = useAtom(page.dataAtom);

  const component = type === 'game' ? <GameOrder /> : type === 'default' ? <DefaultOrder /> : null
  return component
}