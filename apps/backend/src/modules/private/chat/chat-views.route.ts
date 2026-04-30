import Elysia, { t } from "elysia";
import { chat, chatMessageViewsSchema } from "./chat.model";

export const chatMessageViews = new Elysia()
  .get("/:id/views", async ({ params: { id }, query }) => {
    const data = await chat.getViews(id, query)
    return { data }
  }, {
    params: t.Object({
      id: t.Number()
    }),
    query: chatMessageViewsSchema
  })