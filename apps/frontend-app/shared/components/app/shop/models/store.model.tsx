import { reatomAsync, withStatusesAtom } from "@reatom/framework"
import { action, atom, type AtomMut, createCtx, type Ctx } from "@reatom/framework"
import { reatomMap, sleep, withAssign, withConcurrency, withInit, withReset } from "@reatom/framework"
import { logError } from '@/shared/lib/log';
import { snapshots } from '@/shared/models/ssr';
import { type PageContextServer } from 'vike/types';
import { client, withQueryParams } from '@/shared/lib/client-wrapper';
import { clientInstance } from "@/shared/api/client"
import { DEFAULT_SOFT_DELAY } from '@/shared/consts/index';
import { withSearchParamsPersist } from '@reatom/url';
import { withSsr } from "@/shared/models/ssr"
import { cartState } from "./store-cart.model"
import { parseBoolean } from "@/shared/lib/utils"
import { pageState } from "@/shared/models/page-context.model"
import { translate } from "@/shared/locales/helpers"

// todo: replace any assertion
export type Payment = any

type StoreCategory = "donate" | "event" | "all"
type StoreWallet = "CHARISM" | "BELKOIN" | "ALL"

// TODO: replace to generated types
export type StoreItemsParams = {
  category: StoreCategory,
  wallet: StoreWallet,
  searchQuery: string | undefined
}

export type StoreItemsPayload = ExtractApiData<"getStoreItems">["data"]

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
      withAssign((_, name) => ({
        category: atom<StoreCategory>("all", `${name}.category`).pipe(
          withSearchParamsPersist('c', (c = "all") => c),
          withReset(),
        ),
        wallet: atom<StoreWallet>("ALL", `${name}.wallet`).pipe(
          withSearchParamsPersist('w', (w = "ALL") => w),
        ),
        searchQuery: atom<string>("", `${name}.searchQuery`).pipe(
          withSearchParamsPersist('sq', (sq = "") => sq),
        ),
        all: reatomMap<string, string>(new Map(), `${name}.all`).pipe(withSsr(`${name}.all`))
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

export const storeItems = atom(null, "storeItems").pipe(
  withAssign((_, name) => ({
    async init(pageCtx: PageContextServer) {
      const headers = pageCtx.headers;
      if (!headers) return;

      const ctx = createCtx();

      const category = pageCtx.urlParsed.search["c"] ?? "all"
      const wallet = pageCtx.urlParsed.search["w"] ?? "ALL"
      const searchQuery = pageCtx.urlParsed.search["sq"] ?? undefined;

      const searchParams = {
        category,
        wallet,
        searchQuery
      }

      const res = await clientInstance.get("store/items", {
        searchParams, headers
      });

      const data = await res.json<WrappedResponse<StoreItemsPayload>>();
      if ("error" in data) throw new Error(data.error)

      const payload = data.data

      // set/update the client_id
      const setCookieValue = res.headers.getSetCookie()

      if (setCookieValue.length >= 1) {
        pageCtx.headersResponse = res.headers
      }

      for (const [origin, val] of Object.entries(searchParams)) {
        storeItemsState.filters.all.set(ctx, origin, val)
      }

      storeItemsState.data(ctx, payload.data);
      storeItemsState.meta(ctx, payload.meta);

      const newSnapshot = snapshots.merge(ctx, pageCtx)
      pageCtx.snapshot = newSnapshot
    },
    fetch: reatomAsync(async (ctx) => {
      const params: StoreItemsParams = {
        category: ctx.get(storeItemsState.filters.category),
        wallet: ctx.get(storeItemsState.filters.wallet),
        searchQuery: ctx.get(storeItemsState.filters.searchQuery)
      }

      return await ctx.schedule(() => getStoreItems(params, { signal: ctx.controller.signal }))
    }, {
      name: `${name}.fetch`,
      onFulfill: (ctx, { data, meta }) => {
        storeItemsState.data(ctx, data)
        storeItemsState.meta(ctx, meta)
      },
      onReject: (_, e) => logError(e)
    }).pipe(
      withStatusesAtom()
    ),
    onChangeEvent: action(async (ctx, e: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = e.target;
      storeItemsState.filters.searchQuery(ctx, value)

      await sleep(DEFAULT_SOFT_DELAY)

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

export type Filter = {
  title: string,
  origin: string,
  atom: AtomMut<any>,
  updater: <T>(ctx: Ctx, val: T) => void,
  filters: Array<{
    name: string,
    value: string,
  }>
}

export const filtersState = atom(null, "filters").pipe(
  withAssign((_, name) => ({
    data: atom<Filter[]>((ctx) => {
      return [
        {
          title: translate["store.filters.type.label"](),
          origin: "category",
          atom: storeItemsState.filters.category,
          updater: (ctx, v) => storeItemsState.filters.category(ctx, v as StoreCategory),
          filters: [
            { name: translate["store.filters.type.variants.all"](), value: "all" },
            { name: translate["store.filters.type.variants.donate"](), value: "donate", },
            { name: translate["store.filters.type.variants.event"](), value: "event" },
          ]
        },
        {
          title: translate["store.filters.wallet.label"](),
          origin: "wallet",
          atom: storeItemsState.filters.wallet,
          updater: (ctx, v) => storeItemsState.filters.wallet(ctx, v as StoreWallet),
          filters: [
            { name: translate["store.filters.wallet.variants.all"](), value: "ALL", },
            { name: translate["store.filters.wallet.variants.charism"](), value: "CHARISM" },
            { name: translate["store.filters.wallet.variants.belkoin"](), value: "BELKOIN", }
          ]
        }
      ]
    }, `${name}.data`)
  }))
)

export const filterIsAppliedAtom = ({
  origin, currValue }: Pick<Filter, "origin"> & { currValue: string }
) => atom((ctx) => {
  const isClient = ctx.spy(pageState.isClientside)

  if (isClient) {
    const atom = ctx.get(filtersState.data).find(d => d.origin === origin)?.atom

    if (atom) {
      const spyedResult = ctx.spy(atom)
      return spyedResult === currValue
    }

    return false
  }

  // server only
  const valueByParsedFilter = storeItemsState.filters.all.get(ctx, origin)
  if (typeof valueByParsedFilter === 'undefined') return false;

  if (["false", "true"].includes(valueByParsedFilter)) {
    return parseBoolean(valueByParsedFilter) === parseBoolean(currValue)
  }

  return valueByParsedFilter === currValue
})
