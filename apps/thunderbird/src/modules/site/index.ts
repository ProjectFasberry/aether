import Elysia from "elysia";
import { siteContent } from "./content.route";
import { siteAccess } from "./access.route";

export const site = new Elysia()
  .group("/site", (app) => app
    .use(siteContent)
    .use(siteAccess)
  );
