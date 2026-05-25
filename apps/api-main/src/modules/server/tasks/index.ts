import Elysia from "elysia";
import { tasksSolo } from "./tasks-solo.route";
import { tasksList } from "./tasks-list.route";

export const tasks = new Elysia()
  .group("/task", app => app
    .use(tasksList)
    .use(tasksSolo)
  )