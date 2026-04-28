import * as z from "zod/v4";
import { action, atom, AtomMut } from "@reatom/core";
import { reatomAsync, withAssign, withCache, withDataAtom, withReset, withStatusesAtom } from "@reatom/framework";
import { createNewsSchema } from "@repo/shared/schemas/news";
import { toast } from "sonner";
import { client, withJsonBody, withQueryParams } from "@/shared/lib/client-wrapper";
import { devLog, logError } from "@/shared/lib/log";
import { generateHTML, type JSONContent } from "@tiptap/react"
import { actionsTargetAtom, collectChanges, compareChanges, notifyAboutRestrictRole } from "./actions.model";
import { editorExtensions } from "@/shared/components/config/editor";
import { withUndo } from "@reatom/undo";
import { newsUpdateSchema } from "@repo/shared/schemas/news";
import { alertDialog } from "@/shared/components/config/alert-dialog.model";
import { navigate } from "vike/client/router";

type NewsPayload = ExtractApiData<"getSharedNewsList">["data"]
type News = NewsPayload["data"][number];

export const newsListAction = reatomAsync(async (ctx) => {
  return await ctx.schedule(() =>
    client<NewsPayload>("privated/news/list", { signal: ctx.controller.signal })
      .pipe(withQueryParams({ asc: false, content: true }))
      .exec()
  )
}, "newsListAction").pipe(
  withDataAtom(null), 
  withStatusesAtom(), 
  withCache({ swr: false })
)

// 
export const createNewsTitleAtom = atom("", "createNewsTitle").pipe(withReset());
export const createNewsDescriptionAtom = atom("", "createNewsDescription").pipe(withReset());
export const createNewsImageAtom = atom("", "createNewsImage").pipe(withReset());
export const createNewsContentAtom = atom<JSONContent | null>(null, "createNewsContent").pipe(withReset());
export const createNewsTempContentAtom = atom<string>("", "createNewsTempContent").pipe(withReset());

export const createNews = atom(null, "news").pipe(
  withAssign((ctx, name) => ({
    resetFull: action((ctx) => {
      createNewsTitleAtom.reset(ctx)
      createNewsDescriptionAtom.reset(ctx)
      createNewsImageAtom.reset(ctx)
      createNewsContentAtom.reset(ctx)
      createNewsTempContentAtom.reset(ctx)
    }, `${name}.resetFull`),
    isValid: atom((ctx) => {
      const value: Nullable<z.infer<typeof createNewsSchema>> = {
        title: ctx.spy(createNewsTitleAtom),
        description: ctx.spy(createNewsDescriptionAtom),
        imageUrl: ctx.spy(createNewsImageAtom),
        content: ctx.spy(createNewsContentAtom),
      }

      const result = z.safeParse(createNewsSchema, value).success;

      return result
    }, `${name}.isValid`),
    contentIsValid: atom((ctx) => ctx.spy(createNewsTempContentAtom).length >= 1, `${name}.contentIsValid`),
    getValues: action((ctx) => {
      const json = {
        title: ctx.get(createNewsTitleAtom),
        description: ctx.get(createNewsDescriptionAtom),
        imageUrl: ctx.get(createNewsImageAtom),
        content: ctx.get(createNewsContentAtom)
      }

      return json
    }, `${name}.getValues`),
    saveContent: action((ctx, json: JSONContent) => {
      createNewsContentAtom(ctx, json);
      toast.success("Изменения применены")
    }, `${name}.saveContent`)
  }))
)

export const createNewsAction = reatomAsync(async (ctx) => {
  const json = createNews.getValues(ctx);

  return await ctx.schedule(() =>
    client
      .post<News>("privated/news/create")
      .pipe(withJsonBody(json))
      .exec()
  )
}, {
  name: "createNewsAction",
  onFulfill: (ctx, res) => {
    toast.success("Новость создана")

    newsListAction.cacheAtom.reset(ctx)
    newsListAction.dataAtom(ctx,
      (state) => state ? { data: [...state.data, res], meta: state.meta } : null
    )

    createNews.resetFull(ctx)
  },
  onReject: (ctx, e) => {
    notifyAboutRestrictRole(e)
    logError(e)
  }
}).pipe(withStatusesAtom())

// 
export const editNewsTitleAtom = atom<string>('', 'editNewsTitle').pipe(withReset(), withUndo({ length: 200 }))
export const editNewsDescAtom = atom<string>('', 'editNewsDesc').pipe(withReset(), withUndo({ length: 200 }))
export const editNewsContentAtom = atom<JSONContent | null>(null, 'editNewsContent').pipe(withReset(), withUndo())
export const editNewsImageUrlAtom = atom<string>('', 'editNewsImageUrl').pipe(withReset(), withUndo())
export const editNewsTempContentAtom = atom<string>('', 'editNewsTempContent').pipe(withReset(), withUndo({ length: 200 }))

const editFormAtoms: Record<string, AtomMut<any>> = {
  title: editNewsTitleAtom,
  description: editNewsDescAtom,
  content: editNewsContentAtom,
  imageUrl: editNewsImageUrlAtom,
  tempContent: editNewsTempContentAtom,
}

export const editNews = atom(null, "editNews").pipe(
  withAssign((ctx, name) => ({
    item: atom((ctx) => {
      const id = ctx.spy(actionsTargetAtom);

      if (!id) {
        console.warn("Actions target is not defined")
        return null;
      }

      const targets = ctx.spy(newsListAction.dataAtom)?.data;

      if (!targets) {
        console.warn("Targets is not defined. Refetching...")
        newsListAction(ctx);
        return null;
      }

      const targetItem = targets.find(target => target.id === Number(id))
      if (!targetItem) throw new Error("target item is not defined")

      const targetValues = {
        title: targetItem.title,
        description: targetItem.description,
        content: targetItem.content as JSONContent,
        imageUrl: targetItem.imageUrl,
        tempContent: generateHTML(targetItem.content as JSONContent, editorExtensions)
      }

      editNewsTitleAtom(ctx, targetValues.title)
      editNewsDescAtom(ctx, targetValues.description)
      editNewsContentAtom(ctx, targetValues.content)
      editNewsImageUrlAtom(ctx, targetValues.imageUrl!)

      return targetItem
    }, `${name}.item`),
    isValid: atom((ctx) => {
      const payload = {
        title: ctx.spy(editNewsTitleAtom),
        description: ctx.spy(editNewsDescAtom),
        imageUrl: ctx.spy(editNewsImageUrlAtom),
        tempContent: ctx.spy(editNewsTempContentAtom),
      }

      const old = {
        title: ctx.spy(editNewsTitleAtom.historyAtom)[1],
        description: ctx.spy(editNewsDescAtom.historyAtom)[1],
        imageUrl: ctx.spy(editNewsImageUrlAtom.historyAtom)[1],
        tempContent: ctx.spy(editNewsTempContentAtom.historyAtom)[1],
      }

      return compareChanges(payload, old)
    }, `${name}.isValid`),
    getOldValues: action((ctx) => ({
      title: ctx.get(editNewsTitleAtom.historyAtom)[1],
      description: ctx.get(editNewsDescAtom.historyAtom)[1],
      content: ctx.get(editNewsContentAtom.historyAtom)[1],
      imageUrl: ctx.get(editNewsImageUrlAtom.historyAtom)[1],
    }), `${name}.getOldValues`),
    getValues: action((ctx) => ({
      title: ctx.get(editNewsTitleAtom),
      description: ctx.get(editNewsDescAtom),
      content: ctx.get(editNewsContentAtom),
      imageUrl: ctx.get(editNewsImageUrlAtom),
    }), `${name}.getValues`),
    resetFull: action((ctx) => {
      editNewsTitleAtom.reset(ctx)
      editNewsDescAtom.reset(ctx)
      editNewsImageUrlAtom.reset(ctx)
      editNewsContentAtom.reset(ctx)
      editNewsTempContentAtom.reset(ctx)
    }, `${name}.resetFull`),
    updateField: action((ctx, key: keyof typeof editFormAtoms, value: any) => {
      const fieldAtom = editFormAtoms[key]
      if (!fieldAtom) return
      fieldAtom(ctx, value)
    }, `${name}.updateField`),
    saveContent: action((ctx, json: JSONContent) => {
      editNewsContentAtom(ctx, json);
      toast.success("Изменения применены")
    }, `${name}.saveContent`)
  }))
)

// 
export const editNewsAction = reatomAsync(async (ctx) => {
  const id = ctx.get(actionsTargetAtom);

  const changes = collectChanges(
    editNews.getValues(ctx),
    editNews.getOldValues(ctx)
  )

  devLog(editNews.getValues(ctx))
  devLog(editNews.getOldValues(ctx))
  devLog(changes)

  const body = Object.entries(changes).map(([field, value]) => ({ field, value })) as z.infer<typeof newsUpdateSchema>

  return await ctx.schedule(() =>
    client
      .post(`privated/news/${id}/edit`)
      .pipe(withJsonBody(body))
      .exec()
  )
}, {
  name: "editNewsAction",
  onFulfill: (ctx, res) => {
    toast.success("Изменения сохранены");

    ctx.schedule(() => navigate("/private/config"));
    editNews.resetFull(ctx);
  },
  onReject: (ctx, e) => {
    logError(e)
    notifyAboutRestrictRole(e)
  }
}).pipe(withStatusesAtom())


// 
const itemToRemoveAtom = atom<{ id: number, title: string } | null>(null, "itemToRemove").pipe(withReset())

export const deleteNewsBeforeAction = action((ctx, item: { id: number, title: string }) => {
  itemToRemoveAtom(ctx, item)

  alertDialog.open(ctx, {
    title: `Вы точно хотите удалить "${item.title}"?`,
    confirmAction: action((ctx => deleteNewsAction(ctx, item.id))),
    confirmLabel: "Удалить",
    cancelAction: action((ctx) => itemToRemoveAtom.reset(ctx)),
    autoClose: true
  });
}, "deleteNewsBeforeAction")

export const deleteNewsAction = reatomAsync(async (ctx, id: number) => {
  return await ctx.schedule(() =>
    client
      .delete<{ id: number }>(`privated/news/${id}`)
      .exec()
  )
}, {
  name: "deleteNewsAction",
  onFulfill: (ctx, res) => {
    toast.success("Новость удалена")

    newsListAction.cacheAtom.reset(ctx)
    newsListAction.dataAtom(ctx,
      (state) => state ? { data: state.data.filter(news => news.id !== res.id), meta: state.meta } : null
    )
  },
  onReject: (ctx, e) => {
    notifyAboutRestrictRole(e)
    logError(e)
  }
}).pipe(withStatusesAtom())