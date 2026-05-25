import Elysia from "elysia";
import { modpackCreate } from "./modpack-create.route";
import { modpackDelete } from "./modpack-delete.route";

export const modpacks = new Elysia()
  .group("/modpacks", app => app
    .use(modpackCreate)
    .use(modpackDelete)
  )