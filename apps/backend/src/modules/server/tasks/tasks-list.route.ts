import { general } from "#/shared/database/general-db"
import { metaSchema, withData, withMeta } from "#/shared/schemas"
import { getDirection } from "#/utils/config/paginate"
import { wrapMeta } from "#/utils/config/transforms"
import type { TasksPayload } from "@repo/shared/types/entities/other"
import Elysia, { t } from "elysia"
import { executeWithCursorPagination } from "kysely-paginate"
import type * as z from "zod/v4"
import { taskPayload } from "./tasks.model"

const tasksListSchema = metaSchema.pick({ asc: true, endCursor: true })

async function getTasks({ asc, endCursor }: z.infer<typeof tasksListSchema>) {
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
    }
  })