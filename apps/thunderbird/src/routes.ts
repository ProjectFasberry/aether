import Elysia from "elysia";
import { store } from "./modules/store";
import { payments } from "./modules/payments/payment.route";
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
import { serversWithMap } from "./modules/server-ip";
import { launcher } from "./modules/launcher";
import { fact } from "./modules/fact";
import { banner } from "./modules/banner";
import { wiki } from "./modules/wiki";
import { openApiPlugin } from "./lib/plugins/openapi";
import { misc } from "./modules/misc";
import { avatars } from "./modules/avatars";
import { contentManifest } from "./modules/content/manifest.route";
import { releases } from "./modules/releases";
import { yggdrasil } from "./modules/yggdrasil";
import { html } from '@elysia/html';
import previewHtml from "../static/preview.html" with { type: "text" }

export const main = new Elysia()
  .group("", app => app
    .use(news)
    .use(modpack)
    .use(rules)
    .use(serversWithMap)
    .use(launcher)
    .use(fact)
    .use(banner)
    .use(wiki)
    .use(misc)
    .use(avatars)
    .use(contentManifest)
    .use(releases)
    .use(yggdrasil)
  )
  .use(auth)
  .use(me)
  .use(serverGroup)
  .use(store)
  .use(payments)
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
  .group("", app => app
    .use(html())
    // @ts-expect-error
    .get('/', ({ html }) => html(previewHtml), {
      detail: {
        summary: "Return static welcome HTML"
      }
    })
    .get("/favicon.ico", () => "")
  )
  .use(health)
  .use(appGroup)
  .use(validateGroup)
  .use(privatedGroup)
  .group("/third-party", app => app
    .use(processPlayerVote)
  )
