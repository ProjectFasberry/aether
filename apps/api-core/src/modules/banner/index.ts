import Elysia from "elysia";
import { bannerLatest, bannerSolo } from "./banner-solo.route";
import { bannerView } from "./banner-view.route";
import { bannerList } from "./banner-list.route";

export const banner = new Elysia()
  .group("/banner", app => app
    .use(bannerList)
    .use(bannerLatest)
    .use(bannerSolo)
    .use(bannerView)
  )