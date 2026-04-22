import { reatomAsync } from "@reatom/async";
import { atom, Ctx } from "@reatom/core";
import { OrderEventPayload } from "@repo/shared/types/entities/payment";
import { toast } from "sonner";
import { withAssign, withReset } from "@reatom/framework";
import { API_PREFIX_URL } from "@/shared/env";
import { logError } from "@/shared/lib/log";
import { client } from "@/shared/lib/client-wrapper";
import { OrderSingleDefault, OrderSinglePayload } from "@repo/shared/types/entities/store";

export const msgAtom = atom<OrderEventPayload | null>(null, "msg")
export const connectIsSuccessAtom = atom(false, "isSuccess")
export const esAtom = atom<EventSource | null>(null, "eventSource").pipe(withReset())
export const esDisconnectReasonAtom = atom<string>("", "esDisconnectReasonAtom")
export const orderRequestEventAtom = atom<OrderEventPayload["type"] | null>(null, "orderRequestEvent");

export const es = (url: string) => new EventSource(url, { withCredentials: true });

type MessageHandler = (payload: { ctx: Ctx }) => void

const MESSAGE_ACTIONS: Record<OrderEventPayload["type"], MessageHandler> = {
  "invoice_paid": ({ ctx }) => {
    orderDataAtom(ctx, (state) => state ? ({ ...state, status: "succeeded" }) : null)

    const source = ctx.get(esAtom)
    if (!source) return;

    esDisconnectReasonAtom(ctx, "invoice_paid")
    toast.warning(`Event source is disconnected. Reason: ${ctx.get(esDisconnectReasonAtom)}`)
    source.close()
  },
  "canceled": ({ ctx }) => {
    orderDataAtom(ctx, (state) => state ? ({ ...state, status: "canceled" }) : null)
  }
}

msgAtom.onChange((ctx, target) => {
  if (!target) return;
  const action = MESSAGE_ACTIONS[target.type]
  orderRequestEventAtom(ctx, target.type)
  action({ ctx })
})

esAtom.onChange((ctx, target) => {
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
    console.log(event)
  })

  target.addEventListener("payload", (event) => {
    try {
      msgAtom(ctx, JSON.parse(event.data))
    } catch (e) {
      console.error('Failed to parse message data:', event.data, e);
    }
  })
})

export const targetOrderIdAtom = atom<string>("", "targetOrderId")
export const orderDataAtom = atom<OrderSingleDefault | null>(null, "orderData")

export const connectToOrderEventsAction = reatomAsync(async (ctx, orderId: string) => {
  const url = `${API_PREFIX_URL}/store/order/${orderId}/events`;
  targetOrderIdAtom(ctx, orderId);
  const source = esAtom(ctx, es(url))
  return source
}, {
  name: "connectToOrderEventsAction",
  onReject: (_, e) => {
    logError(e, { type: "toast" })
  }
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
