import { DEFAULT_SOFT_DELAY } from "@/shared/consts/index";
import { client, withQueryParams } from "@/shared/lib/client-wrapper";
import { reatomAsync, withDataAtom, withErrorAtom, withStatusesAtom } from "@reatom/async";
import { action, atom, sleep, withAssign, withConcurrency } from "@reatom/framework";
import { TasksPayload } from "@repo/shared/types/entities/other";

export type TasksFilterSortBy = "relevance"

const FILTERS = [
  {
    title: "Актуальности", value: "relevance"
  }
]

export const tasksFilter = atom(null, "tasksFilter").pipe(
  withAssign(() => ({
    sortBy: atom<TasksFilterSortBy>("relevance", ``),
    searchQuery: atom<string>("", "tasksSearchQuery"),
    endCursor: atom<Nullable<string>>(null, "tasksCursor"),
    asc: atom(false, "tasksAscending"),
    FILTERS
  }))
)

export const tasks = atom(null, "tasks").pipe(
  withAssign((_, name) => ({
    fetch: reatomAsync(async (ctx) => {
      const params = {
        asc: ctx.get(tasksFilter.asc),
        endCursor: ctx.get(tasksFilter.endCursor),
        searchQuery: ctx.get(tasksFilter.searchQuery)
      }

      return await ctx.schedule(() =>
        client
          .get<TasksPayload>("server/task/list", {
            signal: ctx.controller.signal
          })
          .pipe(
            withQueryParams(params)
          )
          .exec()
      )
    }, `${name}.fetch`).pipe(
      withDataAtom(null, (_, data) => data.data.length === 0 ? null : data),
      withStatusesAtom(),
      withErrorAtom()
    ),
    onChangeEvent: action(async (ctx, e) => {
      const { value } = e.target;
      tasksFilter.searchQuery(ctx, value)

      await sleep(DEFAULT_SOFT_DELAY)

      tasks.fetch(ctx)
    }).pipe(
      withConcurrency()
    )
  }))
)

tasksFilter.asc.onChange((ctx) => tasks.fetch(ctx))