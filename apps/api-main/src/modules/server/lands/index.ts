import Elysia from "elysia";
import { landsList } from "./lands-list.route";
import { landsSolo } from "./lands-solo.route";
import { landsByPlayer } from "./lands-by-player.route";

export const lands = new Elysia()
  .group("/lands", app => app
    .use(landsList)
    .use(landsSolo)
    .use(landsByPlayer)
  )