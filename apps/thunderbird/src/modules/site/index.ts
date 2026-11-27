import Elysia from "elysia";
import { siteContent } from "./content.route";
import { siteAccess } from "./access.route";
import { siteGallery } from "./gallery.route";

export const site = new Elysia()
  .group("/site", (app) => app
    .use(siteContent)
    .use(siteGallery)
    .use(siteAccess)
  );
