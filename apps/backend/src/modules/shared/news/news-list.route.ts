import Elysia from "elysia";
import { ipPlugin } from "#/lib/plugins/index";
import { withData } from "#/shared/schemas";
import { createNewsViews, getNewsList, newsPayloadSchema, newsSchema } from "./news.model";
import type { NewsPayload } from "@repo/shared/types/entities/news";

export const newsList = new Elysia()
  .use(ipPlugin())
  .get("/list", async ({ query }) => {
    const data = await getNewsList(query)
    return { data }
  }, {
    query: newsSchema,
    response: {
      200: withData(
        newsPayloadSchema
      )
    },
    afterResponse: ({ responseValue, ip }) => {
      if (!responseValue) return;

      const responseData = responseValue as { data: NewsPayload } | undefined
      if (!responseData) return

      const { data } = responseData.data

      createNewsViews({
        ids: data.map(target => target.id), ip
      })
    }
  })