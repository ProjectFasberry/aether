import Elysia from "elysia";
import { modpackList } from "./modpack-list.route";
import { modpackSingle } from "./modpack-solo.route";

export const modpack = new Elysia()
  .group("/modpack", app => app
    .use(modpackList)
    .use(modpackSingle)
  )