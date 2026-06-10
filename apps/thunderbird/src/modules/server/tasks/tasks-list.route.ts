import { general } from "#/shared/database/general-db"
import { metaSchema, withData, withMeta } from "#/shared/schemas"
import { getDirection } from "#/utils/config/paginate"
import { wrapMeta } from "#/utils/config/transforms"
import Elysia, { type Static, t } from "elysia"
import { executeWithCursorPagination } from "kysely-paginate"
import { taskPayload } from "./tasks.model"
import { buildRouteSummary } from "#/utils"

export type TaskItem = {
  id: number;
  description: string;
  created_at: Date;
  title: string;
  expires: Date | null;
  action_type: string;
  action_value: string | null;
  reward_currency: string;
  reward_value: number;
};

export type TasksPayload = {
  data: TaskItem[];
  meta: PaginatedMeta;
};

const tasksListSchema = t.Pick(metaSchema, ["asc", "endCursor"])

async function getTasks({ asc, endCursor }: Static<typeof tasksListSchema>) {
  const baseQuery = general
    .selectFrom("tasks")
    .select([
      "id",
      "title",
      "description",
      "action_value",
      "reward_value",
      "reward_currency",
      "action_type",
      "created_at",
      'expires'
    ])

  const direction = getDirection(asc)

  const config = {
    after: endCursor,
    perPage: 32
  }

  const result = await executeWithCursorPagination(baseQuery, {
    ...config,
    fields: [
      { key: "created_at", expression: "created_at", direction }
    ],
    parseCursor: (cursor) => ({
      created_at: new Date(cursor.created_at)
    })
  })

  return {
    data: result.rows,
    meta: wrapMeta(result)
  }
}

export const tasksList = new Elysia()
  .get("/list", async ({ query }) => {
    const data: TasksPayload = await getTasks(query)
    return { data }
  }, {
    query: tasksListSchema,
    response: {
      200: withData(
        t.Object({
          data: t.Array(taskPayload),
          meta: withMeta
        })
      )
    },
    detail: {
      summary: buildRouteSummary("Get tasks list")
    }
  })
