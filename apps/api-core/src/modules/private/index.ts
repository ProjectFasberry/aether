import Elysia from "elysia";
import { options } from "./options";
import { permissions } from "./permissions";
import { storePrivate } from "./store";
import { users } from "./users";
import { roles } from "./roles";
import { news } from "./news";
import { banners } from "./banners";
import { modpacks } from "./modpacks";
import { events } from "./events";
import { history } from "./history";
import { chat } from "./chat";
import { dictionaries } from "./dictionaries";
import { volume } from "./volume";
import { lands } from "./lands";
import { api } from "./api";

export const privated = new Elysia()
  .group("/privated", app => app
    .use(options)
    .use(permissions)
    .use(storePrivate)
    .use(users)
    .use(roles)
    .use(news)
    .use(banners)
    .use(modpacks)
    .use(events)
    .use(history)
    .use(chat)
    .use(dictionaries)
    .use(volume)
    .use(lands)
    .use(api)
)
