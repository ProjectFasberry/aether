import { PageContextServer } from "vike/types";
import { useConfig } from 'vike-react/useConfig'
import { logRouting } from "@/shared/lib/log";
import { getOrder } from "@/shared/components/app/shop/models/store-order.model";
import { render } from "vike/abort";
import { OrderSingle, OrderSinglePayload } from "@repo/shared/types/entities/store";

export type Data = Awaited<ReturnType<typeof data>>;

function metadata(order: OrderSingle) {
  return {
    title: `Заказ ${order.unique_id}`
  }
}

export async function data(pageCtx: PageContextServer) {
  logRouting(pageCtx.urlPathname, "data")
  
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