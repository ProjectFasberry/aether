import Elysia from "elysia";
import { eventsCreate } from "./events-create.route";
import { eventsDelete } from "./events-delete.route";

export const events = new Elysia()
  .group("/events", app => app
    .use(eventsCreate)
    .use(eventsDelete)
  )