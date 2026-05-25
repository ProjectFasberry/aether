import Elysia from "elysia";
import { bannerCreate } from "./banner-create.route";
import { bannerDelete } from "./banner-delete.route";
import { bannerEdit } from "./banner-edit.route";

export const banners = new Elysia()
  .group("/banners", app => app
    .use(bannerCreate)
    .use(bannerDelete)
    .use(bannerEdit)
  )