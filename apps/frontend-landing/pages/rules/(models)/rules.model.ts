import { atom, reatomAsync, withAssign, withCache, withDataAtom, withStatusesAtom } from "@reatom/framework";
import { wrapClient } from "@/shared/lib/api";
import { toast } from "solid-sonner";
import { client } from "@/shared/api/client";
import { isError } from "@/shared/lib/helpers";

type RulesTag = { title: string, value: string }

type RulesType = {
  id: number,
  content: any,
  category: string,
  updated_at: Date | null,
  created_at: Date
}

export const rules = atom(null, "rules").pipe(
  withAssign((_, name) => ({
    fetchList: reatomAsync(async (ctx) => {
      return await ctx.schedule(() =>
        wrapClient<RulesType[]>(() => client("shared/rules/list", { signal: ctx.controller.signal, throwHttpErrors: false }))
      )
    }, {
      name: `${name}.fetchList`,
      onReject: (_, e) => {
        if (isError(e)) {
          toast.error("Произошла ошибка", { description: e.message })
        }
      }
    }).pipe(
      withDataAtom(null),
      withCache({ swr: false }),
      withStatusesAtom()
    ),
    fetchTags: reatomAsync(async (ctx) => {
      return await ctx.schedule(() =>
        wrapClient<RulesTag[]>(() => client("shared/rules/tags"))
      )
    }, {
      name: `${name}.fetchTags`,
      onReject: (_, e) => {
        if (isError(e)) {
          toast.error("Произошла ошибка", { description: e.message })
        }
      }
    }).pipe(
      withStatusesAtom(),
      withCache({ swr: false }),
      withDataAtom()
    )
  }))
)
