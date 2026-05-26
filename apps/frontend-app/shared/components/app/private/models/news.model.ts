import * as z from "zod";
import { action, atom, type AtomMut } from "@reatom/framework";
import { reatomAsync, withAssign, withCache, withDataAtom, withReset, withStatusesAtom } from "@reatom/framework";
import { createNewsSchema, newsUpdateSchema } from "@/shared/schemas/news";
import { toast } from "sonner";
import { client, withJsonBody, withQueryParams } from "@/shared/lib/client-wrapper";
import { generateHTML, type JSONContent } from "@tiptap/react"
import { actionsTargetAtom, collectChanges, compareChanges, notifyAboutRestrictRole } from "./actions.model";
import { withUndo } from "@reatom/undo";
import { alertDialog } from "@/shared/components/config/alert-dialog/alert-dialog.model";
import { navigate } from "vike/client/router";
import { editorExtensions } from "@/shared/components/config/editor/editor.model";

type NewsPayload = ExtractApiData<"getSharedNewsList">["data"]
type News = NewsPayload["data"][number];

export const newsListAction = reatomAsync(async (ctx) => {
  return await ctx.schedule(() =>
    client
      .get<NewsPayload>("privated/news/list", { signal: ctx.controller.signal })
      .pipe(withQueryParams({ asc: false, content: true }))
      .exec()
  )
}, "newsListAction").pipe(
  withDataAtom(null),
  withStatusesAtom(),
  withCache({ swr: false })
)

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
    }),
    isValid: atom((ctx) => {
      const value: Nullable<z.infer<typeof createNewsSchema>> = {
        title: ctx.spy(createNewsTitleAtom),
        description: ctx.spy(createNewsDescriptionAtom),
        imageUrl: ctx.spy(createNewsImageAtom),
        content: ctx.spy(createNewsContentAtom),
      }

      return createNewsSchema.safeParse(value).success
    }),
    contentIsValid: atom((ctx) => ctx.spy(createNewsTempContentAtom).length >= 1, `${name}.contentIsValid`),
    saveContent: action((ctx, json: JSONContent) => {
      createNewsContentAtom(ctx, json);
      toast.success("Изменения применены")
    }),
    submit: reatomAsync(async (ctx) => {
      const json = {
        title: ctx.get(createNewsTitleAtom),
        description: ctx.get(createNewsDescriptionAtom),
        imageUrl: ctx.get(createNewsImageAtom),
        content: ctx.get(createNewsContentAtom)
      }

      return await client
        .post<News>("privated/news/create")
        .pipe(withJsonBody(json))
        .exec()
    }, {
      name: "createNewsAction",
      onFulfill: (ctx, res) => {
        toast.success("Новость создана")

        newsListAction.cacheAtom.reset(ctx)
        newsListAction.dataAtom(ctx, (state) => state ? { data: [...state.data, res], meta: state.meta } : null)
        createNews.resetFull(ctx)
      },
      onReject: (_, e) => notifyAboutRestrictRole(e)
    }).pipe(
      withStatusesAtom()
    )
  }))
)

export const editNewsState = atom(null, "editNewsState").pipe(
  withAssign(() => ({
    title: atom<string>('', 'editNewsTitle').pipe(withReset(), withUndo({ length: 200 })),
    description: atom<string>('', 'editNewsDesc').pipe(withReset(), withUndo({ length: 200 })),
    content: atom<JSONContent | null>(null, 'editNewsContent').pipe(withReset(), withUndo()),
    imageUrl: atom<string>('', 'editNewsImageUrl').pipe(withReset(), withUndo()),
    tempContent: atom<string>('', 'editNewsTempContent').pipe(withReset(), withUndo({ length: 200 }))
  }))
)

const editFormAtoms: Record<string, AtomMut<any>> = {
  title: editNewsState.title,
  description: editNewsState.description,
  content: editNewsState.content,
  imageUrl: editNewsState.imageUrl,
  tempContent: editNewsState.tempContent,
}

export const editNews = atom(null, "editNews").pipe(
  withAssign((_, name) => ({
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

      editNewsState.title(ctx, targetValues.title)
      editNewsState.description(ctx, targetValues.description)
      editNewsState.content(ctx, targetValues.content)
      editNewsState.imageUrl(ctx, targetValues.imageUrl!)

      return targetItem
    }),
    isValid: atom((ctx) => {
      const payload = {
        title: ctx.spy(editNewsState.title),
        description: ctx.spy(editNewsState.description),
        imageUrl: ctx.spy(editNewsState.imageUrl),
        tempContent: ctx.spy(editNewsState.tempContent),
      }

      const old = {
        title: ctx.spy(editNewsState.title.historyAtom)[1],
        description: ctx.spy(editNewsState.description.historyAtom)[1],
        imageUrl: ctx.spy(editNewsState.imageUrl.historyAtom)[1],
        tempContent: ctx.spy(editNewsState.tempContent.historyAtom)[1],
      }

      return compareChanges(payload, old)
    }, `${name}.isValid`),
    getOldValues: action((ctx) => ({
      title: ctx.get(editNewsState.title.historyAtom)[1],
      description: ctx.get(editNewsState.description.historyAtom)[1],
      content: ctx.get(editNewsState.content.historyAtom)[1],
      imageUrl: ctx.get(editNewsState.imageUrl.historyAtom)[1],
    })),
    getValues: action((ctx) => ({
      title: ctx.get(editNewsState.title),
      description: ctx.get(editNewsState.description),
      content: ctx.get(editNewsState.content),
      imageUrl: ctx.get(editNewsState.imageUrl),
    })),
    resetFull: action((ctx) => {
      editNewsState.title.reset(ctx)
      editNewsState.description.reset(ctx)
      editNewsState.imageUrl.reset(ctx)
      editNewsState.content.reset(ctx)
      editNewsState.tempContent.reset(ctx)
    }),
    updateField: action((ctx, key: keyof typeof editFormAtoms, value: any) => {
      const fieldAtom = editFormAtoms[key]
      if (!fieldAtom) return
      fieldAtom(ctx, value)
    }),
    saveContent: action((ctx, json: JSONContent) => {
      editNewsState.content(ctx, json);
      toast.success("Изменения применены")
    }),
    submit: reatomAsync(async (ctx) => {
      const id = ctx.get(actionsTargetAtom);

      const changes = collectChanges(
        editNews.getValues(ctx),
        editNews.getOldValues(ctx)
      )

      const body = Object.entries(changes).map(([field, value]) => ({ field, value })) as z.infer<typeof newsUpdateSchema>

      return await client
        .post(`privated/news/${id}/edit`)
        .pipe(withJsonBody(body))
        .exec()
    }, {
      name: "editNewsAction",
      onFulfill: (ctx, res) => {
        toast.success("Изменения сохранены");

        ctx.schedule(() => navigate("/private/config"));
        editNews.resetFull(ctx);
      },
      onReject: (_, e) => notifyAboutRestrictRole(e)
    }).pipe(
      withStatusesAtom()
    )
  }))
)

const itemToRemoveAtom = atom<{ id: number, title: string } | null>(null, "itemToRemove").pipe(withReset())

export const deleteNews = atom(null, "deleteNews").pipe(
  withAssign((_, name) => ({
    deleteBefore: action((ctx, item: { id: number, title: string }) => {
      itemToRemoveAtom(ctx, item)

      alertDialog.open(ctx, {
        title: `Вы точно хотите удалить "${item.title}"?`,
        confirmAction: action((ctx => deleteNews.submit(ctx, item.id))),
        confirmLabel: "Удалить",
        cancelAction: action((ctx) => itemToRemoveAtom.reset(ctx)),
        autoClose: true
      });
    }, `${name}.deleteBefore`),
    submit: reatomAsync(async (ctx, id: number) => {
      return await client.delete<{ id: number }>(`privated/news/${id}`).exec()
    }, {
      name: `${name}.submit`,
      onFulfill: (ctx, res) => {
        toast.success("Новость удалена")

        newsListAction.cacheAtom.reset(ctx)
        newsListAction.dataAtom(ctx, (state) => state ? { data: state.data.filter(news => news.id !== res.id), meta: state.meta } : null)
      },
      onReject: (_, e) => notifyAboutRestrictRole(e)
    }).pipe(
      withStatusesAtom()
    )
  }))
)
