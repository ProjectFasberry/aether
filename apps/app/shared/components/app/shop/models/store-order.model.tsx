import { reatomAsync, withStatusesAtom } from "@reatom/async";
import { action, Action, atom, Ctx } from "@reatom/core";
import { CreateOrderRoutePayload, OrderEventPayload } from "@repo/shared/types/entities/payment";
import { toast } from "sonner";
import { withAssign, withReset } from "@reatom/framework";
import { API_PREFIX_URL } from "@/shared/env";
import { logError } from "@/shared/lib/log";
import { client } from "@/shared/lib/client-wrapper";
import { OrderSingleDefault, OrderSinglePayload, OrderType } from "@repo/shared/types/entities/store";
import { TopUpButton } from "../components/wallet/top-up-button";
import { navigate } from "vike/client/router";

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

export const order = atom(null, "order").pipe(
  withAssign((_, name) => ({
    connect: reatomAsync(async (ctx, orderId: string) => {
      const url = `${API_PREFIX_URL}/store/order/${orderId}/events`;
      orderState.id(ctx, orderId);
      return orderState.es(ctx, es(url))
    }, {
      name: `${name}.connect`,
      onReject: (_, e) => logError(e, { type: "toast" })
    }),
    create: reatomAsync(async (ctx) => {
      return await ctx.schedule(() =>
        client
          .post<CreateOrderRoutePayload>("store/order/create", {
            throwHttpErrors: false,
            retry: 1
          })
          .exec()
      )
    }, {
      name: `${name}.create`,
      onFulfill: (ctx, res) => {
        if (!res) return;

        ctx.schedule(() => {
          createdOrderDataAtom(ctx, res);
          navigate(
            getOrderUrl(res.purchase.uniqueId, "default")
          )
        })
      },
      onReject: (ctx, e) => {
        logError(e);

        if (e instanceof Error) {
          if (e.message === 'insufficient') {
            toast.error("Недостаточно баланса", {
              action: <TopUpButton />
            })
            return;
          }

          if (e.message === 'items-not-found') {
            toast.error("Товары не найдены или устарели")
            return;
          }

          toast.error("Произошла ошибка при создании заказа", { description: "Повтори попытку позже" })
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

    const source = ctx.get(orderState.es)
    if (!source) return;

    orderState.disconnectReason(ctx, "invoice_paid")
    source.close()
  }),
  "canceled": action((ctx) => {
    orderState.data(ctx, (state) => state ? ({ ...state, status: "canceled" }) : null)
  })
}

orderState.msg.onChange((ctx, target) => {
  if (!target) return;

  const action = MESSAGE_ACTIONS[target.type];

  orderState.requestEvent(ctx, target.type)
  action(ctx)
})

orderState.es.onChange((ctx, target) => {
  if (!target) return;

  target.onopen = () => {
    if (import.meta.env.DEV) {
      toast.success("Connected to order events")
    }
  }

  target.addEventListener("config", (event) => {
    console.log(event)
  })

  target.addEventListener("ping", (event) => {
    if (import.meta.env.DEV) {
      toast.info("Ping")
      console.log(event)
    }
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
    .get<OrderSinglePayload>(`store/order/${id}`, {
      ...init,
      searchParams: {
        type
      }
    })
    .exec()
}

export const createdOrderDataAtom = atom<CreateOrderRoutePayload | null>(null)
export const getOrderUrl = (uniqueId: string, t: Exclude<OrderType, "all"> = "default") =>
  `/store/order/status/${uniqueId}?type=${t}`
