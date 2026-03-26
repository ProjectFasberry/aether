import { storeItemCreateSchema } from '@repo/shared/schemas/store/index';
import { logError } from "@/shared/lib/log";
import { action, atom, AtomState, batch } from "@reatom/core";
import { reatomAsync, reatomRecord, withAssign, withCache, withDataAtom, withReset, withStatusesAtom } from "@reatom/framework";
import { getStoreItems, StoreItemsParams } from "../../shop/models/store.model";
import { StoreItemsPayload } from "@repo/shared/types/entities/store";
import { client, withJsonBody, withLogging } from "@/shared/lib/client-wrapper";
import { toast } from "sonner";
import { notifyAboutRestrictRole } from "./actions.model";
import { alertDialog } from "@/shared/components/config/alert-dialog.model";
import * as z from "zod/v4";
import type { JSONContent } from "@tiptap/react";
import { navigate } from "vike/client/router";
import { newsUpdateSchema } from "@repo/shared/schemas/news";

type CreateItemStoreSchema = z.infer<typeof storeItemCreateSchema>

export const createStoreItemTitleAtom = atom<CreateItemStoreSchema["title"]>("", "createStoreItemTitle").pipe(withReset());
export const createStoreItemImageUrlAtom = atom<Nullable<CreateItemStoreSchema["imageUrl"]>>(null, "createStoreItemImageUrl").pipe(withReset());
export const createStoreItemCurrencyAtom = atom<CreateItemStoreSchema["currency"]>("CHARISM", "createStoreItemCurrencyAtom").pipe(withReset());
export const createStoreItemValueAtom = atom<Nullable<CreateItemStoreSchema["value"]>>(null, "createStoreItemValue").pipe(withReset());
export const createStoreItemContentAtom = atom<JSONContent>({}, "createStoreItemContent").pipe(withReset());
export const createStoreItemPriceAtom = atom<CreateItemStoreSchema["price"]>("0", "createStoreItemPrice").pipe(withReset());
export const createStoreItemСommandAtom = atom<CreateItemStoreSchema["command"]>("", "createStoreItemСommand").pipe(withReset());
export const createStoreItemTypeAtom = atom<Nullable<CreateItemStoreSchema["type"]>>(null, "createStoreItemType").pipe(withReset());

export const createStoreItem = atom(null, "createStoreItem").pipe(
  withAssign((ctx, name) => ({
    resetFull: action((ctx) => {
      createStoreItemTitleAtom.reset(ctx)
      createStoreItemImageUrlAtom.reset(ctx)
      createStoreItemCurrencyAtom.reset(ctx)
      createStoreItemValueAtom.reset(ctx)
      createStoreItemContentAtom.reset(ctx)
      createStoreItemPriceAtom.reset(ctx)
      createStoreItemСommandAtom.reset(ctx)
      createStoreItemTypeAtom.reset(ctx)
    }, `${name}.resetFull`)
  }))
)

type StoreItem = StoreItemsPayload["data"][number]

export const createStoreItemAction = reatomAsync(async (ctx) => {
  const body = {
    title: ctx.get(createStoreItemTitleAtom),
    imageUrl: ctx.get(createStoreItemImageUrlAtom),
    value: ctx.get(createStoreItemValueAtom),
    currency: ctx.get(createStoreItemCurrencyAtom),
    content: ctx.get(createStoreItemContentAtom),
    price: ctx.get(createStoreItemPriceAtom),
    command: ctx.get(createStoreItemСommandAtom),
    type: ctx.get(createStoreItemTypeAtom)
  }

  return await ctx.schedule(() =>
    client
      .post<StoreItem>("privated/store/item/create")
      .pipe(withJsonBody(body))
      .exec()
  )
}, {
  name: "createStoreItemAction",
  onFulfill: (ctx, res) => {
    toast.success("Товар создан");

    batch(ctx, () => {
      storeItemsAction.cacheAtom.reset(ctx);
      storeItemsAction(ctx)
    })

    createStoreItem.resetFull(ctx)

    ctx.schedule(() => navigate("/private/store"))
  },
  onReject: (_, e) => {
    notifyAboutRestrictRole(e)
    logError(e, { type: "combined" })
  }
}).pipe(withStatusesAtom())

// 
export const itemToRemoveAtom = atom<StoreItem | null>(null, "itemToRemove").pipe(withReset())

export const removeStoreItemBeforeAction = action((ctx, item: StoreItem) => {
  alertDialog.open(ctx, {
    title: `Вы точно хотите удалить товар "${item.title}"?`,
    confirmAction: action((ctx => removeStoreItemAction(ctx, item.id))),
    confirmLabel: "Удалить",
    cancelAction: action((ctx) => itemToRemoveAtom.reset(ctx)),
    autoClose: true
  });

  itemToRemoveAtom(ctx, item)
}, "removeStoreItemBeforeAction")

export const removeStoreItemAction = reatomAsync(async (ctx, id: number) => {
  return await ctx.schedule(() =>
    client
      .delete<{ id: number }>(`privated/store/item/${id}`)
      .exec()
  )
}, {
  name: "removeStoreItemAction",
  onFulfill: (ctx, res) => {
    toast.success("Товар удален");

    storeItemsAction.cacheAtom.reset(ctx);
    storeItemsAction(ctx)
  },
  onReject: (ctx, e) => {
    logError(e, { type: "combined" })
  }
}).pipe(withStatusesAtom())

// 
export const itemToEditAtom = atom<StoreItem | null>(null, "itemToEdit").pipe(withReset())

export const editStoreItemAction = reatomAsync(async (ctx, id: number) => {
  const json = {}

  const body = Object.entries(json).map(([field, value]) => ({
    field,
    value
  })) as z.infer<typeof newsUpdateSchema>

  return await ctx.schedule(() =>
    client
      .post(`privated/store/item/edit/${id}`)
      .pipe(withJsonBody(body), withLogging())
      .exec()
  )
}, {
  name: "editStoreItemAction",
  onFulfill: (ctx, res) => {
    
  },
  onReject: (ctx, e) => {
    logError(e, { type: "combined" })
  }
}).pipe(withStatusesAtom())

// 
export const storeCategoryAtom = atom<StoreItemsParams["type"]>("all");
export const storeWalletFilterAtom = atom<StoreItemsParams["wallet"]>("ALL");

export const storeItemsAction = reatomAsync(async (ctx) => {
  const params: StoreItemsParams = {
    type: ctx.get(storeCategoryAtom),
    wallet: ctx.get(storeWalletFilterAtom),
    searchQuery: ""
  }

  return await ctx.schedule(() => getStoreItems(params))
}, {
  name: "storeItemsAction",
  onReject: (ctx, e) => {
    logError(e, { type: "combined" })
  }
}).pipe(withDataAtom(null), withStatusesAtom(), withCache({ swr: false }))

export const searchParamsAtom = reatomRecord<Record<string, string>>({}, "searchParams")
export const searchParamTargetAtom = atom<"create" | "edit" | "view">("view", "searchParamTarget")

searchParamsAtom.onChange(async (ctx, state) => {
  const target = state["target"] as AtomState<typeof searchParamTargetAtom> | undefined;
  searchParamTargetAtom(ctx, target ?? "view");

  if (target === 'edit') {
    const data = ctx.get(storeItemsAction.dataAtom)?.data;
    const id = state["id"];

    let item: StoreItemsPayload["data"][number] | null = null;

    if (!data) {
      const requestedData = await storeItemsAction(ctx);
      const requestedItem = requestedData.data.find(d => d.id === Number(id))

      if (requestedItem) {
        item = requestedItem
      }
    } else {
      const currentItem = data.find((d) => d.id === Number(id))

      if (currentItem) {
        item = currentItem
      }
    }

    if (!item) {
      throw new Error('Товар не найден')
    }

    itemToEditAtom(ctx, item)
  }
})