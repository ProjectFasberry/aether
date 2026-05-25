import Elysia from "elysia";
import { news } from "./news";
import { modpack } from "./modpack";
import { banner } from "./banner";
import { fact } from "./fact";
import { rules } from "./rules";
import { serverip, serversWithMap } from "./server-ip";
import { wiki } from "./wiki";

export const shared = new Elysia()
  .group("/shared", app => app
    .use(news)
    .use(modpack)
    .use(rules)
    .use(serverip)
    .use(serversWithMap)
    .use(fact)
    .use(banner)
    .use(wiki)
  )
