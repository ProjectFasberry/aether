import { storeItemCreateSchema } from '@/shared/schemas/store';
import { logError } from "@/shared/lib/log";
import { action, atom, type AtomState, batch } from "@reatom/framework";
import { reatomAsync, reatomRecord, withAssign, withCache, withDataAtom, withReset, withStatusesAtom } from "@reatom/framework";
import { getStoreItems, type StoreItemsParams } from "../../shop/models/store.model";
import { client, withJsonBody } from "@/shared/lib/client-wrapper";
import { toast } from "sonner";
import { notifyAboutRestrictRole } from "./actions.model";
import { alertDialog } from "@/shared/components/config/alert-dialog/alert-dialog.model";
import * as z from "zod";
import type { JSONContent } from "@tiptap/react";
import { navigate } from "vike/client/router";
import { newsUpdateSchema } from "@/shared/schemas/news";
import { type StoreItem } from '../../shop/models/store-item.model';

type CreateItemStoreSchema = z.infer<typeof storeItemCreateSchema>

export const createStoreItemState = atom(null).pipe(
  withAssign(() => ({
    title: atom<CreateItemStoreSchema["title"]>("").pipe(withReset()),
    imgUrl: atom<Nullable<CreateItemStoreSchema["imageUrl"]>>(null).pipe(withReset()),
    currency: atom<CreateItemStoreSchema["currency"]>("CHARISM").pipe(withReset()),
    value: atom<Nullable<CreateItemStoreSchema["value"]>>(null).pipe(withReset()),
    content: atom<JSONContent>({}).pipe(withReset()),
    price: atom<CreateItemStoreSchema["price"]>("0").pipe(withReset()),
    command: atom<CreateItemStoreSchema["command"]>("").pipe(withReset()),
    type: atom<Nullable<CreateItemStoreSchema["type"]>>(null).pipe(withReset())
  }))
)
export const createStoreItem = atom(null).pipe(
  withAssign(() => ({
    resetFull: action((ctx) => {
      createStoreItemState.title.reset(ctx)
      createStoreItemState.imgUrl.reset(ctx)
      createStoreItemState.currency.reset(ctx)
      createStoreItemState.value.reset(ctx)
      createStoreItemState.content.reset(ctx)
      createStoreItemState.price.reset(ctx)
      createStoreItemState.command.reset(ctx)
      createStoreItemState.type.reset(ctx)
    }),
    submit: reatomAsync(async (ctx) => {
      const body = {
        title: ctx.get(createStoreItemState.title),
        imageUrl: ctx.get(createStoreItemState.imgUrl),
        value: ctx.get(createStoreItemState.value),
        currency: ctx.get(createStoreItemState.currency),
        content: ctx.get(createStoreItemState.content),
        price: ctx.get(createStoreItemState.price),
        command: ctx.get(createStoreItemState.command),
        type: ctx.get(createStoreItemState.type)
      }

      return await client
        .post<StoreItem>("privated/store/item/create")
        .pipe(withJsonBody(body))
        .exec()
    }, {
      name: "_",
      onFulfill: (ctx, res) => {
        toast.success("Товар создан");

        batch(ctx, () => {
          storeItems.fetch.cacheAtom.reset(ctx);
          storeItems.fetch(ctx)
        })

        createStoreItem.resetFull(ctx)

        ctx.schedule(() => navigate("/private/store"))
      },
      onReject: (_, e) => {
        notifyAboutRestrictRole(e)
        logError(e, { type: "combined" })
      }
    }).pipe(
      withStatusesAtom()
    )
  }))
)

export const itemToDeleteAtom = atom<StoreItem | null>(null).pipe(withReset())
export const deleteStoreItem = atom(null).pipe(
  withAssign(() => ({
    before: action((ctx, item: StoreItem) => {
      alertDialog.open(ctx, {
        title: `Вы точно хотите удалить товар "${item.title}"?`,
        confirmAction: action((ctx => deleteStoreItem.submit(ctx, item.id))),
        confirmLabel: "Удалить",
        cancelAction: action((ctx) => itemToDeleteAtom.reset(ctx)),
        autoClose: true
      });

      itemToDeleteAtom(ctx, item)
    }),
    submit: reatomAsync(async (ctx, id: number) => {
      return await client
        .delete<{ id: number }>(`privated/store/item/${id}`)
        .exec()
    }, {
      name: "_",
      onFulfill: (ctx, res) => {
        toast.success("Товар удален");

        storeItems.fetch.cacheAtom.reset(ctx);
        storeItems.fetch(ctx)
      },
      onReject: (_, e) => logError(e, { type: "combined" })
    }).pipe(
      withStatusesAtom()
    )
  }))
)

export const itemToEditAtom = atom<StoreItem | null>(null).pipe(withReset())
export const editStoreItem = atom(null).pipe(
  withAssign(() => ({
    submit: reatomAsync(async (ctx, id: number) => {
      const json = {}

      const body = Object.entries(json).map(([field, value]) => ({
        field,
        value
      })) as z.infer<typeof newsUpdateSchema>

      return await client
        .post(`privated/store/item/edit/${id}`)
        .pipe(withJsonBody(body))
        .exec()
    }, {
      name: "_",
      onReject: (_, e) => logError(e, { type: "combined" })
    }).pipe(
      withStatusesAtom()
    )
  }))
)

export const storeState = atom(null).pipe(
  withAssign(() => ({
    searchParams: reatomRecord<Record<string, string>>({}),
    searchParamTarget: atom<"create" | "edit" | "view">("view"),
    category: atom<StoreItemsParams["category"]>("all"),
    wallet: atom<StoreItemsParams["wallet"]>("ALL")
  }))
)
export const storeItems = atom(null).pipe(
  withAssign(() => ({
    fetch: reatomAsync(async (ctx) => {
      const params: StoreItemsParams = {
        category: ctx.get(storeState.category),
        wallet: ctx.get(storeState.wallet),
        searchQuery: ""
      }

      return await ctx.schedule(() => getStoreItems(params))
    }, {
      name: "_",
      onReject: (_, e) => logError(e, { type: "combined" })
    }).pipe(
      withDataAtom(null),
      withStatusesAtom(),
      withCache({ swr: false })
    )
  }))
)

storeState.searchParams.onChange(async (ctx, state) => {
  const target = state["target"] as AtomState<typeof storeState.searchParamTarget> | undefined;
  storeState.searchParamTarget(ctx, target ?? "view");

  if (target === 'edit') {
    const data = ctx.get(storeItems.fetch.dataAtom)?.data;
    const id = state["id"];

    let item: StoreItem | null = null;

    if (!data) {
      const requestedData = await storeItems.fetch(ctx);
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
