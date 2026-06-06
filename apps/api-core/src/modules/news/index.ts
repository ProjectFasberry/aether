import Elysia from "elysia";
import { newsList } from "./news-list.route";
import { newsSingle } from "./news-solo.route";

export const news = new Elysia()
  .group("/news", app => app
    .use(newsList)
    .use(newsSingle)
  )