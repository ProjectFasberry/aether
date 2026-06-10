import Elysia from "elysia";
import { store } from "./modules/store";
import { auth } from "./modules/auth";
import { serverGroup } from "./modules/server";
import { rate } from "./modules/user/like.route";
import { me } from "#/modules/user/me.route";
import { health, service } from "./modules/root/service";
import { force } from "./modules/root/force";
import { appGroup } from "./modules/root/app";
import { validateGroup } from "./modules/root/validate";
import { processPlayerVote } from "./modules/server/votes/process-vote.route";
import { privated } from "./modules/private";
import { account } from "./modules/account";
import { news } from "./modules/news";
import { modpack } from "./modules/modpack";
import { rules } from "./modules/rules";
import { serverip, serversWithMap } from "./modules/server-ip";
import { fact } from "./modules/fact";
import { banner } from "./modules/banner";
import { wiki } from "./modules/wiki";
import { openApiPlugin } from "./lib/plugins/openapi";
import { misc } from "./modules/misc";

export const main = new Elysia()
  .group("", app => app
    .use(news)
    .use(modpack)
    .use(rules)
    .use(serverip)
    .use(serversWithMap)
    .use(fact)
    .use(banner)
    .use(wiki)
    .use(misc)
  )
  .use(auth)
  .use(me)
  .use(serverGroup)
  .use(store)
  .use(rate)
  .use(account)

const privatedGroup = new Elysia()
  // TODO: make openapi with the different path (privated)
  .use(openApiPlugin())
  .group("", { detail: { tags: ["authorized"] } }, app => app
    .use(privated)
    .use(service)
    .use(force)
  )

export const root = new Elysia()
  .get("/", ({ redirect }) => redirect(`/openapi`))
  .use(health)
  .use(appGroup)
  .use(validateGroup)
  .use(privatedGroup)
  .group("/third-party", app => app
    .use(processPlayerVote)
  )
