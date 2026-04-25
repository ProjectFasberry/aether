import { reatomAsync, withStatusesAtom } from "@reatom/async";
import { action, atom } from "@reatom/core";
import { cart, cartState } from "./store-cart.model";
import { logError } from "@/shared/lib/log";
import type { StoreItem } from "@repo/shared/types/entities/store"
import { client, withJsonBody } from "@/shared/lib/client-wrapper";
import { withSsr } from "@/shared/lib/reatom-helpers";
import { withAssign } from "@reatom/framework";
import { SelectItemToCartOptions, storeItemsState } from "./store.model";
import { invariant } from "@/shared/lib/invariant";

export async function getStoreItem(id: string, init: RequestInit) {
  return client
    .get<StoreItem>(`store/item/${id}`, { ...init, throwHttpErrors: false, })
    .exec()
}

type UpdateItemStatusOptions =
  | { patch: Partial<SelectItemToCartOptions> }
  | { remove: true }
  | { set: { isSelected: boolean; isLoading: boolean } }

export const storeItemState = atom(null, "storeItemState").pipe(
  withAssign(() => ({
    data: atom<StoreItem | null>(null, "selectedItem").pipe(withSsr("selectedItem"))
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