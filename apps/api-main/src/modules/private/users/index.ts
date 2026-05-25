import Elysia from "elysia";
import { playersControl } from "./users-control.route";
import { playersList } from "./users-list.route";
import { playersSingle } from "./users-single.route";
import { playersAuth } from "./users-auth.route";

export const users = new Elysia()
  .group("/user", app => app
    .use(playersList)
    .use(playersControl)
    .use(playersAuth)
    .use(playersSingle)
  )