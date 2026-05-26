import { DEFAULT_SOFT_DELAY } from "@/shared/consts/index";
import { client, withQueryParams } from "@/shared/lib/client-wrapper";
import { isEmptyArray } from "@/shared/lib/helpers";
import { reatomAsync, withDataAtom, withErrorAtom, withStatusesAtom } from "@reatom/framework";
import { action, atom, sleep, withAssign, withConcurrency } from "@reatom/framework";

export type TasksPayload = ExtractApiData<"getServerTaskList">["data"]
export type TasksFilterSortBy = "relevance"

const FILTERS = [
  {
    title: "Актуальности", value: "relevance"
  }
]

export const tasksFilter = atom(null, "tasksFilter").pipe(
  withAssign((_, name) => ({
    sortBy: atom<TasksFilterSortBy>("relevance", `${name}.sortBy`),
    searchQuery: atom<string>("", `${name}.searchQuery`),
    endCursor: atom<Nullable<string>>(null, `${name}.endCursor`),
    asc: atom(false, `${name}.asc`),
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
      withDataAtom(null, (_, data) => isEmptyArray(data.data) ? null : data),
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
