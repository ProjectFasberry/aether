import { getNewsList, getNewsListSchema } from "#/modules/news/news.model"
import Elysia from "elysia"

export const newsList = new Elysia()
  .get("/list", async ({ query }) => {
    const data = await getNewsList(query)
    return { data }
  }, {
    query: getNewsListSchema
  })
