import Elysia from "elysia";
import * as z from "zod/v4";
import { getNewsSingle } from "./news.model";

export const newsSingle = new Elysia()
  .get("/:id", async ({ params: { id } }) => {
    const data = await getNewsSingle(id)
    return { data }
  }, {
    params: z.object({ id: z.coerce.number() })
  })