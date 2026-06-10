import Elysia from "elysia";
import { eventsList } from "./events-list.route";
import { eventsSolo } from "./events-solo.route";

export const events = new Elysia()
  .group("/events", app => app
    .use(eventsList)
    .use(eventsSolo)
  )