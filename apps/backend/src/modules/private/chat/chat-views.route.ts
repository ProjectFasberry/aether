import Elysia from "elysia";
import * as z from "zod/v4";
import { chat, chatMessageViewsSchema } from "./chat.model";

export const chatMessageViews = new Elysia()
  .get("/:id/views", async ({ params: { id }, query }) => {
    const data = await chat.getViews(id, query)
    return { data }
  }, {
    params: z.object({
      id: z.coerce.number()
    }),
    query: chatMessageViewsSchema
  })