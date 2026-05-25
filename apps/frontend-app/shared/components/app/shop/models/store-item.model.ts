import { reatomAsync, withStatusesAtom } from "@reatom/framework";
import { action, atom } from "@reatom/framework";
import { cart, cartState } from "./store-cart.model";
import { logError } from "@/shared/lib/log";
import { client, withJsonBody } from "@/shared/lib/client-wrapper";
import { withSsr } from "@/shared/models/ssr";
import { withAssign } from "@reatom/framework";
import { type SelectItemToCartOptions, storeItemsState } from "./store.model";
import { invariant } from "@/shared/lib/invariant";

export type StoreItem = ExtractApiData<"getStoreItems">["data"]["data"][number]

export async function getStoreItem(id: string, init: RequestInit) {
  return client
    .get<StoreItem>(`store/item/${id}`, init)
    .exec()
}

type UpdateItemStatusOptions =
  | { patch: Partial<SelectItemToCartOptions> }
  | { remove: true }
  | { set: { isSelected: boolean; isLoading: boolean } }

export const storeItemState = atom(null, "storeItemState").pipe(
  withAssign((_, name) => ({
    data: atom<StoreItem | null>(null, `${name}.data`).pipe(withSsr(`${name}.data`))
  }))
)

export const storeItem = atom(null, "storeItem").pipe(
  withAssign((_, name) => ({
    add: action((ctx, id: number) => {
      const isSelected = ctx.get(getItemStatus(id))?.isSelected ?? false;

      if (isSelected) {
        cart.removeItem(ctx, id)
        return;
      }

      cart.addItem(ctx, id)
    }, `${name}.add`),
    updateStatus: action((ctx, id: number, options: UpdateItemStatusOptions) => {
      storeItemsState.statuses(ctx, (state) => {
        if (!state) return state;

        const next = { ...state };

        if ('remove' in options && options.remove) {
          delete next[id];
        }

        if ('set' in options) {
          next[id] = options.set;
        }

        if ('patch' in options) {
          if (!next[id]) return state;
          next[id] = { ...next[id], ...options.patch };
        }

        return next;
      });
    }, `${name}.updateStatus`),
    updateSelectedStatus: reatomAsync(async (ctx, id: number) => {
      const current = ctx.get(cartState.data).find(target => target.id === id);
      invariant(current, "Current is not defined")

      const result = await client
        .post<boolean>(`store/cart/edit/${id}`)
        .pipe(
          withJsonBody({
            key: "selected",
            value: !current.selected
          })
        )
        .exec()

      return { id, result }
    }, {
      name: `${name}.updateSelectedStatus`,
      onFulfill: (ctx, { result, id }) => cart.update(ctx),
      onReject: (_, e) => logError(e, { type: "combined" })
    }).pipe(
      withStatusesAtom()
    )
  }))
)

export const getItemStatus = (id: number) => atom((ctx) => {
  const data = ctx.spy(storeItemsState.statuses)
  if (!data) return null;
  return data[id];
}, `getItemStatus.${id}`)