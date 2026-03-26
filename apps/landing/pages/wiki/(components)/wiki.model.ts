import { client } from "@/shared/api/client";
import { reatomAsync, withCache, withStatusesAtom } from "@reatom/async";
import { atom } from "@reatom/core";
import type { JSONContent } from "@tiptap/react";

export type Wiki = {
  category: string,
  content: JSONContent,
  title: string;
  updated_at: Date | null
}

export type CategoryNode = { title: string, value: string }

type RulesCategoriesPayloadExtend = {
  [key: string]: { title: string, isChilded: boolean, nodes: CategoryNode[] }
}

type RulesCategoriesPayload = {
  [key: string]: { title: string, nodes: CategoryNode[] }
}

type Entries<T> = { [K in keyof T]: [K, T[K]] }[keyof T][];

export const WIKI_PARAM_FALLBACK = "general"

export const wikiParamAtom = atom(WIKI_PARAM_FALLBACK, "wikiParam")

export const wikiCategoriesAtom = atom<Entries<RulesCategoriesPayloadExtend>>([], "wikiCategories")
export const wikiCategoriesNodesAtom = atom<CategoryNode[]>([], "wikiCategoriesNodes")

export const wikiCategoriesAction = reatomAsync(async (ctx) => {
  return await ctx.schedule(async () => {
    const res = await client("shared/wiki/categories", { signal: ctx.controller.signal })
    const data = await res.json<{ data: RulesCategoriesPayload } | { error: string }>()

    if ('error' in data) throw new Error(data.error)
    return data.data
  })
}).pipe(withCache({ swr: false }), withStatusesAtom())

wikiCategoriesAction.onFulfill.onCall((ctx, res) => {
  const categories = Object.entries(
    Object.fromEntries(
      Object.entries(res).map(([key, val]) => [
        key,
        {
          ...val,
          isChilded: val.nodes.length > 0 && val.nodes[0].value !== key
        }
      ])
    )
  )

  const nodes = categories.flatMap(([_, group]) => group.nodes)

  wikiCategoriesAtom(ctx, categories);
  wikiCategoriesNodesAtom(ctx, nodes);
})