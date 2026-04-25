import Elysia, { t } from "elysia";
import { ipPlugin } from "#/lib/plugins/ip";
import { withData, withMeta } from "#/shared/schemas";
import { createNewsViews, getNewsList, newsSchema } from "./news.model";
import type { NewsPayload } from "@repo/shared/types/entities/news";

const newsPayload = t.Object({
  id: t.Number(),
  title: t.String(),
  created_at: t.Date(),
  description: t.String(),
  imageUrl: t.Union([t.String(), t.Null()]),
  views: t.Number(),
  content: t.Record(t.String(), t.Any()),
  creator: t.Object({
    nickname: t.String(),
    avatar: t.String()
  })
})

export const newsList = new Elysia()
  .use(ipPlugin())
  .get("/list", async ({ query }) => {
    const data = await getNewsList(query)
    return { data }
  }, {
    query: newsSchema,
    response: {
      200: withData(
        t.Object({
          data: t.Array(newsPayload),
          meta: withMeta
        })
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