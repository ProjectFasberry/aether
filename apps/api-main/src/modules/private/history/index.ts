import Elysia from "elysia";
import { historyList } from "./history-list.route";
import { historyEvents } from "./history-events.route";

export const history = new Elysia()
  .group("/history", app => app
    .use(historyList)
    .use(historyEvents)
  )