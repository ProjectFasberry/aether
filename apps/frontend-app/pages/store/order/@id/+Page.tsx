import { type Data } from "./+data";
import { useAtom } from "@reatom/npm-react";
import { order, orderState } from "@/shared/components/app/shop/models/store-order.model";
import { pageState } from "@/shared/models/page-context.model";
import { useData } from "vike-react/useData";
import { GameOrder } from "@/shared/components/app/shop/components/order/components/game-order";
import { DefaultOrder } from "@/shared/components/app/shop/components/order/components/default-order";
import { createPageModel } from "@/shared/lib/events";

export type OrderSingleDefault = {
	unique_id: string;
	asset: "USDT" | "TON" | "BTC" | "ETH" | "LTC" | "BNB" | "TRX" | "USDC";
	price: string;
	created_at: Date | string;
	status: "canceled" | "pending" | "succeeded" | "waitingForCapture";
	payload: string;
	order_id: string;
	invoice_id: number;
	pay_url: string;
	initiator: string;
	comment?: string | null
};

const page = createPageModel({
  name: "order",
  onSpyAction: (ctx, dataAtom, pageData) => {
    if (!pageData) return;

    const { data } = pageData as { data: OrderSingleDefault }
    const type = data.type

    if (type === 'default') {
      const routeParams = ctx.get(pageState.routeParams)
      const uniqueId = routeParams.id;
      orderState.data(ctx, data)
      order.connect(ctx, uniqueId)
    }
  },
  spyedAtom: pageState.data
})

export default function Page() {
  const { type } = useData<Data>().data;
  const [_] = useAtom(page.dataAtom);

  const component = type === 'game' ? <GameOrder /> : type === 'default' ? <DefaultOrder /> : null
  return component
}
