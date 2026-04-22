import { reatomAsync, withStatusesAtom } from "@reatom/async"
import { action, atom, batch, createCtx } from "@reatom/core"
import { sleep, withAssign, withConcurrency, withInit, withReset } from "@reatom/framework"
import type { Selectable } from "kysely"
import type { OrderType, StoreItemsPayload } from "@repo/shared/types/entities/store"
import { CreateOrderRoutePayload } from "@repo/shared/types/entities/payment"
import { navigate } from 'vike/client/router';
import { Payments } from "@repo/shared/types/db/payments-database-types"
import { logError } from '@/shared/lib/log';
import { mergeSnapshot } from '@/shared/lib/snapshot';
import { PageContextServer } from 'vike/types';
import { toast } from 'sonner';
import { client, withQueryParams } from '@/shared/lib/client-wrapper';
import { clientInstance } from "@/shared/api/client"
import { TopUpButton } from '../components/wallet/top-up-button';
import { DEFAULT_SOFT_TIMEOUT } from '@/shared/consts/delays';
import { withSearchParamsPersist } from '@reatom/url';
import { withSsr } from "@/shared/lib/reatom-helpers"
import { cartState } from "./store-cart.model"

export type Payment = Selectable<Payments>

type StoreCategory = "donate" | "event" | "all"
type StoreWalletFilter = "CHARISM" | "BELKOIN" | "ALL"

export type StoreItemsParams = {
  type: StoreCategory,
  wallet: StoreWalletFilter,
  searchQuery: string | undefined
}

export async function getStoreItems(params: StoreItemsParams, init?: RequestInit) {
  return client
    .get<StoreItemsPayload>("store/items", init)
    .pipe(
      withQueryParams(params)
    )
    .exec()
}

export type SelectItemToCartOptions = {
  isSelected: boolean,
  isLoading: boolean
}

type SelectItemToCartStatus = Record<number, SelectItemToCartOptions>

export const storeItemsState = atom(null, "storeItemsState").pipe(
  withAssign((_, name) => ({
    data: atom<Nullable<StoreItemsPayload["data"]>>(null, `${name}.data`).pipe(withSsr(`${name}.data`)),
    meta: atom<Nullable<StoreItemsPayload["meta"]>>(null, `${name}.meta`).pipe(withSsr(`${name}.meta`)),
    filters: atom(null, `${name}.filters`).pipe(
      withAssign(() => ({
        category: atom<StoreCategory>("all", `${name}.category`).pipe(
          withSearchParamsPersist('c', (c = "all") => c),
          withReset(),
        ),
        wallet: atom<StoreWalletFilter>("ALL", `${name}.wallet`).pipe(
          withSearchParamsPersist('w', (w = "ALL") => w),
        ),
        searchQuery: atom<string>("", `${name}.searchQuery`).pipe(
          withSearchParamsPersist('sq', (sq = "") => sq)
        )
      }))
    ),
    statuses: atom<SelectItemToCartStatus | null>(null, `itemStatuses`).pipe(
      withInit((ctx) => {
        const target = ctx.get(cartState.data)

        const record = target.reduce<SelectItemToCartStatus>((acc, item) => {
          acc[item.id] = {
            isLoading: false,
            isSelected: true
          };

          return acc;
        }, {});

        return record
      }),
      withReset()
    )
  }))
)

storeItemsState.filters.category.onChange((ctx) => storeItems.fetch(ctx))
storeItemsState.filters.wallet.onChange((ctx) => storeItems.fetch(ctx))

export const createdOrderDataAtom = atom<CreateOrderRoutePayload | null>(null)
export const getOrderUrl = (uniqueId: string, t: Exclude<OrderType, "all"> = "default") =>
  `/store/order/status/${uniqueId}?type=${t}`

export const order = atom(null, "order").pipe(
  withAssign((_, name) => ({
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

export const storeItems = atom(null, "storeItems").pipe(
  withAssign((_, name) => ({
    async init(pageCtx: PageContextServer) {
      const headers = pageCtx.headers;
      const ctx = createCtx();

      if (headers) {
        const type = pageCtx.urlParsed.search["c"] ?? "all"
        const wallet = pageCtx.urlParsed.search["w"] ?? "ALL"
        const searchQuery = pageCtx.urlParsed.search["sq"] ?? undefined;

        const res = await clientInstance.get("store/items", {
          searchParams: {
            type, wallet, searchQuery
          },
          headers
        });

        const data = await res.json<WrappedResponse<StoreItemsPayload>>();

        if ("error" in data) throw new Error(data.error)

        const payload = data.data

        // set/update the client_id
        const setCookieValue = res.headers.getSetCookie()

        if (setCookieValue.length >= 1) {
          pageCtx.headersResponse = res.headers
        }

        storeItemsState.data(ctx, payload.data);
        storeItemsState.meta(ctx, payload.meta);
      }

      const newSnapshot = mergeSnapshot(ctx, pageCtx)
      pageCtx.snapshot = newSnapshot
    },
    fetch: reatomAsync(async (ctx) => {
      const params: StoreItemsParams = {
        type: ctx.get(storeItemsState.filters.category),
        wallet: ctx.get(storeItemsState.filters.wallet),
        searchQuery: ctx.get(storeItemsState.filters.searchQuery)
      }

      return await ctx.schedule(() => getStoreItems(params, { signal: ctx.controller.signal }))
    }, {
      name: `${name}.fetch`,
      onFulfill: (ctx, { data, meta }) => {
        batch(ctx, () => {
          storeItemsState.data(ctx, data)
          storeItemsState.meta(ctx, meta)
        })
      },
      onReject: (_, e) => logError(e, { type: "combined" })
    }).pipe(
      withStatusesAtom()
    ),
    onChangeEvent: action(async (ctx, e: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = e.target;
      storeItemsState.filters.searchQuery(ctx, value)

      await ctx.schedule(() => sleep(DEFAULT_SOFT_TIMEOUT))

      storeItems.fetch(ctx)
    }).pipe(
      withConcurrency()
    ),
    simulate: action((ctx, id: number, type: "load" | "select" | "unload" | "unselect") => {
      storeItemsState.statuses(ctx, (state) => {
        const prev = state?.[id] ?? { isLoading: false, isSelected: false };
        const next = { ...prev };

        switch (type) {
          case "load":
            next.isLoading = true;
            break;
          case "unload":
            next.isLoading = false;
            break;
          case "select":
            next.isSelected = true;
            break;
          case "unselect":
            next.isSelected = false;
            break;
        }

        return {
          ...state,
          [id]: next,
        };
      })
    })
  }))
)