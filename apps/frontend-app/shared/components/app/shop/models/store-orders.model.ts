import { client, withQueryParams } from "@/shared/lib/client-wrapper";
import { logError } from "@/shared/lib/log";
import { isEmptyArray } from "@/shared/lib/helpers";
import { action, atom, reatomAsync, withAssign, withCache, withDataAtom, withStatusesAtom } from "@reatom/framework";
import { withSearchParamsPersist } from "@reatom/url";

export type OrdersFilterOption = { title: string; value: string };

export const cartOrdersState = atom(null, "cartOrdersState").pipe(
  withAssign((_, name) => ({
    status: atom<string>("all", `${name}.status`).pipe(
      withSearchParamsPersist("status", (d = "all") => d),
    ),
    type: atom<string>("all", `${name}.type`).pipe(
      withSearchParamsPersist("type", (d = "all") => d),
    ),
    STATUS_OPTIONS: [
      { title: "Все", value: "all" },
      { title: "В ожидании", value: "pending" },
      { title: "Завершенные", value: "succeeded" },
    ],
    TYPE_OPTIONS: [
      { title: "Все", value: "all" },
      { title: "Игровые", value: "game" },
      { title: "Пополнение", value: "default" },
    ]
  }))
)

cartOrdersState.status.onChange((ctx) => cartOrders.refetchAll(ctx));
cartOrdersState.type.onChange((ctx) => cartOrders.refetchAll(ctx));

type InternalOrdersPayload = ExtractApiData<"getStoreOrderInternalList">["data"]
type ExternalOrdersPayload = ExtractApiData<"getStoreOrderExternalList">["data"]
type ExternalOrdersParams = ExtractApiParams<"getStoreOrderExternalList">["query"];

async function getInternalOrders({ init }: { init?: RequestInit }) {
  return client
    .get<InternalOrdersPayload>("store/order/internal/list", init)
    .exec()
}
async function getExternalOrders({ params, init }: { params: ExternalOrdersParams, init?: RequestInit }) {
  return client
    .get<ExternalOrdersPayload>("store/order/external/list", init)
    .pipe(
      withQueryParams(params)
    )
    .exec()
}

export const cartOrders = atom(null, "cartOrders").pipe(
  withAssign((_, name) => ({
    refetchAll: action((ctx) => {
      cartOrders.fetch.cacheAtom.reset(ctx);
      cartOrders.fetch(ctx);
    }),
    fetch: reatomAsync(async (ctx) => {
      const type = ctx.get(cartOrdersState.type)
      const target = type === 'game' ? "internal" : "external"

      const EVENTS = {
        internal: () => getInternalOrders({
          init: { signal: ctx.controller.signal }
        }),
        external: () => getExternalOrders({
          params: {
            status: ctx.get(cartOrdersState.status) as ExternalOrdersParams["status"],
          },
          init: { signal: ctx.controller.signal }
        })
      };

      const result = await EVENTS[target]()
      return result
    }, {
      name: `${name}.fetch`,
      onReject: (_, e) => logError(e)
    }).pipe(
      withDataAtom(null, (_, data) => (isEmptyArray(data) ? null : data)),
      withStatusesAtom(),
      withCache({ swr: false }),
    )
  }))
)