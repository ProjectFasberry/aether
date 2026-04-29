import Elysia from "elysia";
import { orderRoute as externalOrderRoute } from "./external/order.route";
import { orderEvents as externalOrderEvents } from "./external/order-events.route";
import { ordersList as externalOrderList } from "./external/orders-list.route";
import { createOrder as externalCreateOrder } from "./external/create-top-up-order.route";
import { methodsList as externalPaymentMethods } from "./external/order-methods.route";
import { currencies as externalCurrencies } from "./external/currencies.route";
import { exchangeRatesRoute as externalExchangeRates } from "./external/exchange-rates.route";
import { createOrder as internalCreateOrder } from "./internal/create-order.route";
import { ordersList as internalOrderList } from "./internal/order-list.route"
import { methodsCurrencies as externalMethodCurrencies } from "./external/order-methods.route"

export const order = new Elysia()
  .group("/order", app => app
    .group("/external", app => app
      .use(externalCreateOrder)
      .use(externalOrderList)
      .group("/methods", app => app
        .use(externalPaymentMethods)
        .use(externalMethodCurrencies)
      )
      .use(externalCurrencies)
      .use(externalExchangeRates)
      .group("/:uniqueId", app => app
        .use(externalOrderRoute)
        .use(externalOrderEvents)
      )
    )
    .group("/internal", app => app
      .use(internalCreateOrder)
      .use(internalOrderList)
    )
  )