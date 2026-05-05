import Elysia from "elysia";
import { options } from "./options";
import { hideOpenApiConfig, openApiPlugin } from "#/lib/plugins/openapi";
import { permissions } from "./permissions";
import { storePrivate } from "./store";
import { users } from "./users";
import { roles } from "./roles";
import { validateBannedStatus } from "#/lib/validators";
import { analytics } from "./analytics";
import { news } from "./news";
import { banners } from "./banners";
import { modpacks } from "./modpacks";
import { events } from "./events";
import { history } from "./history";
import { chat } from "./chat";
import { dictionaries } from "./dictionaries";

export const privated = new Elysia()
  .use(validateBannedStatus())
  .use(openApiPlugin())
  .group("/privated", hideOpenApiConfig, app => app
    .use(options)
    .use(permissions)
    .use(storePrivate)
    .use(users)
    .use(roles)
    .use(news)
    .use(banners)
    .use(modpacks)
    .use(events)
    .use(analytics)
    .use(history)
    .use(chat)
    .use(dictionaries)
  )