import Elysia from "elysia";
import { createOrder as internalCreateOrder } from "./internal/create-order.route";
import { ordersList as internalOrderList } from "./internal/order-list.route"

export const order = new Elysia()
  .group("/order", app => app
    .group("/internal", app => app
      .use(internalCreateOrder)
      .use(internalOrderList)
    )
  )
