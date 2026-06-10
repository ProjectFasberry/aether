import Elysia from "elysia";
import * as z from "zod";
import { general } from "#/shared/database/general-db";
import { withData } from "#/shared/schemas";
import { taskPayload } from "./tasks.model";
import { buildRouteSummary } from "#/utils";

async function getTask(id: number) {
  const query = await general
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
    .where("id", "=", id)
    .executeTakeFirst()

  return query;
}

export const tasksSolo = new Elysia()
  .get("/:id", async ({ params: { id } }) => {
    const data = await getTask(id);
    return { data }
  }, {
    params: z.object({
      id: z.coerce.number()
    }),
    response: {
      200: withData(taskPayload)
    },
    detail: {
      summary: buildRouteSummary("Get task by id")
    }
  })
