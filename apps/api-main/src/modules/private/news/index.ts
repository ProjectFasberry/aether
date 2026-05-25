import Elysia from "elysia";
import { newsCreateRoute } from "./news-create.route";
import { newsDeleteRoute } from "./news-delete.route";
import { newsUpdateRoute } from "./news-update.route";
import { getNewsList, newsSchema } from "#/modules/shared/news/news.model";

const newsList = new Elysia()
  .get("/list", async ({ query }) => {
    const data = await getNewsList(query)

    return { data }
  }, {
    query: newsSchema
  })

export const news = new Elysia()
  .group("/news", app => app
    .use(newsList)
    .use(newsCreateRoute)
    .use(newsDeleteRoute)
    .use(newsUpdateRoute)
  )