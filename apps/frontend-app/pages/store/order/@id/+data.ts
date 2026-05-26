import { type PageContextServer } from "vike/types";
import { useConfig } from 'vike-react/useConfig'
import { logRouting } from "@/shared/lib/log";
import { getOrder } from "@/shared/components/app/shop/models/store-order.model";
import { render } from "vike/abort";
import type { OrderSingleDefault } from "./+Page";

export type OrderSingleGamePayload = {
	unique_id: string;
	initiator: string;
	created_at: Date;
	finished_at: Date | null;
	items: {
		id: number;
		store_item_id: number;
		name: string;
		recipient: string;
	}[];
};

export type OrderSingle = OrderSingleDefault | OrderSingleGamePayload;

export type OrderSinglePayload = OrderSingle & {
	type: "game" | "default";
};


export type Data = Awaited<ReturnType<typeof data>>;

function metadata(order: OrderSingle) {
  return {
    title: `Заказ ${order.unique_id}`
  }
}

export const data = async (pageCtx: PageContextServer) => {
  logRouting(pageCtx.urlPathname, data.name)

  const config = useConfig()
  const headers = pageCtx.headers ?? undefined
  const type = pageCtx.urlParsed.search["type"];

  const order: OrderSinglePayload | null = await getOrder(pageCtx.routeParams.id, { headers }, type).catch(_ => null)
  if (!order) throw render("/not-exist")

  config(metadata(order))

  return {
    data: order
  }
}
