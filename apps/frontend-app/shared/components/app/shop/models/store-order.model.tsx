import { reatomAsync, withStatusesAtom } from "@reatom/framework";
import { action, type Action, atom } from "@reatom/framework";
import { toast } from "sonner";
import { withAssign, withReset } from "@reatom/framework";
import { env } from "@/shared/env";
import { logError } from "@/shared/lib/log";
import { client } from "@/shared/lib/client-wrapper";
import { TopUpButton } from "../components/wallet/top-up-button";
import { navigate } from "vike/client/router";
import { type ReactNode } from "react";
import { type Action as ToasterAction } from "sonner"
import type { OrderSingleDefault } from "@/pages/store/order/@id/+Page";
import type { OrderSinglePayload } from "@/pages/store/order/@id/+data";
import type { CreateOrderRoutePayload, OrderEventPayload } from "@/shared/schemas/payment";

export const orderState = atom(null, "orderState").pipe(
  withAssign((_, name) => ({
    es: atom<EventSource | null>(null).pipe(withReset()),
    msg: atom<OrderEventPayload | null>(null, `${name}.msg`),
    disconnectReason: atom<string>("", `${name}.disconnectReason`),
    connectIsSuccess: atom(false, `${name}.connectIsSuccess`),
    requestEvent: atom<OrderEventPayload["type"] | null>(null, `${name}.requestEvent`),
    data: atom<OrderSingleDefault | null>(null, `${name}.data`),
    id: atom<string>("", `${name}.id`)
  }))
)

const ERRORS_MAP: Record<string, string> = {
  "INTERNAL_SERVER_ERROR": "Произошла ошибка при создании заказа",
  "ITEMS_NOT_FOUND": "Товары не найдены или устарели",
  "INSUFFICIENT": "Недостаточно баланса",
}

const ERRORS_EVENTS: Record<string, { cb: () => ToasterAction | ReactNode }> = {
  "INSUFFICIENT": { cb: () => <TopUpButton /> }
}

export const order = atom(null, "order").pipe(
  withAssign((_, name) => ({
    connect: action((ctx, orderId: string) => {
      orderState.id(ctx, orderId);
      orderState.es(ctx, es(getOrderEventsUrl(orderId)))
    }),
    create: reatomAsync(async () => {
      return await client
        .post<CreateOrderRoutePayload>("store/order/internal/create", {
          retry: 1
        })
        .exec()
    }, {
      name: `${name}.create`,
      onFulfill: (ctx, res) => {
        createdOrderDataAtom(ctx, res);
        ctx.schedule(() => navigate(getOrderUrl(res.purchase.uniqueId, "default")))
      },
      onReject: (_, e) => {
        logError(e);

        if (e instanceof Error) {
          const msg = ERRORS_MAP[e.message] ?? Object.entries(ERRORS_MAP)?.[0]?.[1]
          const event = ERRORS_EVENTS[e.message];

          toast.error(msg, {
            action: event ? event.cb() : {} as ToasterAction
          })
        }
      }
    }).pipe(
      withStatusesAtom()
    )
  }))
)

export const es = (url: string) => new EventSource(url, { withCredentials: true });

const MESSAGE_ACTIONS: Record<OrderEventPayload["type"], Action<[], void>> = {
  "invoice_paid": action((ctx) => {
    orderState.data(ctx, (state) => state ? ({ ...state, status: "succeeded" }) : null)

    const es = ctx.get(orderState.es)
    if (!es) return;

    orderState.disconnectReason(ctx, "invoice_paid")
    es.close()
  }),
  "canceled": action((ctx) => {
    orderState.data(ctx, (state) => state ? ({ ...state, status: "canceled" }) : null)
  })
}

orderState.msg.onChange((ctx, target) => {
  if (!target) return;

  const action = MESSAGE_ACTIONS[target.type];
  action(ctx)
  orderState.requestEvent(ctx, target.type)
})

orderState.es.onChange((ctx, target) => {
  if (!target) return;

  target.onopen = () => {
    import.meta.env.DEV && toast.success("Connected to order events")
  }

  target.addEventListener("config", (event) => {
    console.log(event)
  })

  target.addEventListener("ping", (event) => {
    import.meta.env.DEV && toast.info("Ping")
  })

  target.addEventListener("payload", (event) => {
    try {
      orderState.msg(ctx, JSON.parse(event.data))
    } catch (e) {
      console.error('Failed to parse message data:', event.data, e);
    }
  })
})

export async function getOrder(id: string, init: RequestInit, type: string = "default") {
  return client
    .get<OrderSinglePayload>(`store/order/external/${id}`, {
      ...init, searchParams: { type }
    })
    .exec()
}

export const getOrderEventsUrl = (orderId: string) => `${env.VITE_API_URL}/store/order/${orderId}/events`
export const createdOrderDataAtom = atom<CreateOrderRoutePayload | null>(null)
export const getOrderUrl = (uniqueId: string, t: string = "default") => `/store/order/status/${uniqueId}?type=${t}`
export const loaderIsActiveAtom = atom((ctx) => ctx.spy(order.create.statusesAtom).isPending)
