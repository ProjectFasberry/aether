import Elysia from "elysia";
import { storeItem } from "./items/store-item.route";
import { storeItems } from "./items/store-items.route";
import { cart } from "./cart/cart.route";
import { checkOrderRoute } from "./order/external/check-order.route";
import { order } from "./order";

export const store = new Elysia()
  .group("/store", app => app
    .group("/hooks", app => app
      .use(checkOrderRoute)
    )
    .group("", app => app
      .use(storeItem)
      .use(storeItems)
    )
    .use(cart)
    .use(order)
  )