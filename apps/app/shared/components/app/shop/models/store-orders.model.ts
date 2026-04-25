import { client, withQueryParams } from "@/shared/lib/client-wrapper";
import { logError } from "@/shared/lib/log";
import { isEmptyArray } from "@/shared/lib/utils";
import { action, atom, reatomAsync, withAssign, withCache, withDataAtom, withStatusesAtom } from "@reatom/framework";
import { withSearchParamsPersist } from "@reatom/url";
import { PaymentStatus } from "@repo/shared/types/db/general-database-types";
import { OrderSingleDefault } from "@repo/shared/types/entities/store";

export type Orders =
  | {
    type: "game";
    created_at: Date;
    initiator: string;
    unique_id: string;
    finished_at: Date | null;
    status: "succeeded";
  }
  | {
    type: "default";
    unique_id: string;
    asset: string;
    created_at: Date;
    initiator: string;
    invoice_id: number;
    order_id: string;
    pay_url: string;
    payload: string;
    price: string;
    status: PaymentStatus;
  }
  | (OrderSingleDefault & {
    type: "default";
  });

export type StoreOrdersStateStatus = "all" | "succeeded" | "pending"
export type StoreOrdersStateType = "default" | "game" | "all"

export type OrdersFilterOption = { title: string; value: string };

const STATUS_OPTIONS = [
  { title: "Все", value: "all" },
  { title: "В ожидании", value: "pending" },
  { title: "Завершенные", value: "succeeded" },
];

const TYPE_OPTIONS = [
  { title: "Все", value: "all" },
  { title: "Игровые", value: "game" },
  { title: "Пополнение", value: "default" },
];

export const cartOrdersState = atom(null, "cartOrdersState").pipe(
  withAssign((_, name) => ({
    status: atom<StoreOrdersStateStatus>("all", `${name}.status`).pipe(
      withSearchParamsPersist("status", (d = "all") => d),
    ),
    type: atom<StoreOrdersStateType>("all", `${name}.type`).pipe(
      withSearchParamsPersist("type", (d = "all") => d),
    ),
    STATUS_OPTIONS,
    TYPE_OPTIONS
  }))
)

cartOrdersState.status.onChange((ctx) => cartOrders.refetchAll(ctx));
cartOrdersState.type.onChange((ctx) => cartOrders.refetchAll(ctx));

export const cartOrders = atom(null, "cartOrders").pipe(
  withAssign((_, name) => ({
    refetchAll: action((ctx) => {
      cartOrders.fetch.cacheAtom.reset(ctx);
      cartOrders.fetch(ctx);
    }),
    fetch: reatomAsync(async (ctx) => {
      const params = {
        type: ctx.get(cartOrdersState.type),
        status: ctx.get(cartOrdersState.status),
      };

      return await ctx.schedule(() =>
        client
          .get<Orders[]>("store/order/list", {
            signal: ctx.controller.signal,
          })
          .pipe(
            withQueryParams(params)
          )
          .exec()
      );
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

export const cartOrdersFilterAtom = atom<"pending" | "succeeded" | "all">("all", "storeCartFilter");

export const cartOrdersFilteredAtom = atom((ctx) => {
  const filter = ctx.spy(cartOrdersFilterAtom);

  let data: Orders[] = [];

  if (filter === "succeeded") {
    const orders = ctx.spy(cartOrders.fetch.dataAtom);
    data = orders ? orders.filter((target) => target.status === "succeeded") : [];
  }

  if (filter === "pending") {
    const orders = ctx.spy(cartOrders.fetch.dataAtom);
    data = orders ? orders.filter((target) => target.status === "pending") : [];
  }

  if (filter === "all") {
    data = ctx.spy(cartOrders.fetch.dataAtom) ?? [];
  }

  return data;
});
