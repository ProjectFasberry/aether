import { client, withJsonBody } from "@/shared/lib/client-wrapper";
import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/framework";
import { action, atom } from "@reatom/framework";
import { compareChanges, notifyAboutRestrictRole } from "./actions.model";
import { withAssign, withReset } from "@reatom/framework";
import { withUndo } from '@reatom/undo'
import { alertDialog } from "@/shared/components/config/alert-dialog/alert-dialog.model";

export type DictionariesItem = {
  value: string;
  created_at: Date;
  id: number;
  key: string;
}

export const dictionariesListAction = reatomAsync(async (ctx) => {
  return await ctx.schedule(() =>
    client<DictionariesItem[]>("privated/dictionaries/list").exec()
  )
}).pipe(withDataAtom(), withStatusesAtom(), withCache({ swr: false }))

export const dictState = atom(null, "dictState").pipe(
  withAssign(() => ({
    editId: atom<Nullable<number>>(null, "dictionariesEditId").pipe(withReset()),
    editKey: atom<Nullable<string>>(null, "dictionariesEditKey").pipe(withReset(), withUndo({ length: 200 })),
    editValue: atom<Nullable<string>>(null, "dictionariesEditValue").pipe(withReset(), withUndo({ length: 200 })),
    createKey: atom<string>("", "dictionariesCreateKey").pipe(withReset()),
    createValue: atom<string>("", "dictionariesCreateValue").pipe(withReset())
  }))
)

export const dictionariesEdit = atom(null, "dictionariesEdit").pipe(
  withAssign(() => ({
    start: action((ctx, id: number) => {
      const target = ctx.get(dictionariesListAction.dataAtom)?.find(d => d.id === id)
      if (!target) throw new Error("Target is not defined")

      dictState.editId(ctx, target.id);
      dictState.editKey(ctx, target.key)
      dictState.editValue(ctx, target.value)
    }),
    resetFull: action((ctx) => {
      dictState.editId.reset(ctx)
      dictState.editKey.reset(ctx)
      dictState.editValue.reset(ctx);
    }),
    getIsEdit: (id: number) => atom((ctx) => ctx.spy(dictState.editId) === id,),
    isValid: atom((ctx) => {
      const payload = {
        key: ctx.spy(dictState.editKey),
        value: ctx.spy(dictState.editValue)
      }

      const old = {
        key: ctx.get(dictState.editKey.historyAtom)[1],
        value: ctx.get(dictState.editValue.historyAtom)[1]
      }

      return compareChanges(payload, old)
    }),
  }))
)

export const dict = atom(null, "dict").pipe(
  withAssign(() => ({
    create: reatomAsync(async (ctx) => {
      const json = {
        key: ctx.get(dictState.createKey),
        value: ctx.get(dictState.createValue)
      }

      return await client
        .post<DictionariesItem>("privated/dictionaries/create")
        .pipe(withJsonBody(json))
        .exec()
    }, {
      name: "dictionariesCreateAction",
      onFulfill: (ctx, res) => {
        dictState.createKey.reset(ctx)
        dictState.createValue.reset(ctx);

        dictionariesListAction.dataAtom(ctx, (state) => state ? [...state, res] : [res]);
      },
      onReject: (_, e) => notifyAboutRestrictRole(e)
    }).pipe(withStatusesAtom()),
    edit: reatomAsync(async (ctx, id: number) => {
      const json = {
        key: ctx.get(dictState.editKey),
        value: ctx.get(dictState.editValue)
      }

      return await client
        .post<DictionariesItem>(`privated/dictionaries/${id}/edit`)
        .pipe(withJsonBody(json))
        .exec()
    }, {
      name: "dictionariesEditAction",
      onFulfill: (ctx, res) => {
        dictionariesEdit.resetFull(ctx)
        dictionariesListAction.dataAtom(ctx, (state) => state ? state.filter(s => s.id !== res.id) : [])
      },
      onReject: (_, e) => notifyAboutRestrictRole(e)
    }).pipe(withStatusesAtom()),
    delete: reatomAsync(async (ctx, id: number) => {
      return await client
        .delete<{ id: number }>(`privated/dictionaries/${id}/remove`)
        .exec()
    }, {
      name: "dictionariesCreateAction",
      onFulfill: (ctx, res) => {
        dictionariesListAction.dataAtom(ctx, (state) => state ? state.filter(s => s.id !== res.id) : [])
      },
      onReject: (_, e) => notifyAboutRestrictRole(e)
    }).pipe(withStatusesAtom()),
    deleteBefore: action((ctx, item: { id: number, title: string }) => {
      itemToRemoveAtom(ctx, item)

      alertDialog.open(ctx, {
        title: `Вы точно хотите удалить "${item.title}"?`,
        confirmAction: action((ctx => dict.delete(ctx, item.id))),
        confirmLabel: "Удалить",
        cancelAction: action((ctx) => itemToRemoveAtom.reset(ctx)),
        autoClose: true
      });
    }, "deleteDictionariesBeforeAction")
  }))
)

const itemToRemoveAtom = atom<{ id: number, title: string } | null>(null, "itemToRemove").pipe(withReset())
