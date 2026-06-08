import Elysia, { redirect, t } from "elysia";
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
import { S3 } from "./shared/minio/client";
import { wrapError } from "./utils";
import { withError } from "./shared/schemas";

const MISC_FILES: Partial<Record<string, { variant: "static" | "redirect", content: string  }>> = {
  terms: { variant: "static", content: "info_terms_page.pdf" },
  privacy: { variant: "static", content: "info_privacy_page.pdf" },
  contacts: { variant: "static", content: "info_contacts_page.pdf" },
  telegram: { variant: "redirect", content: "https://t.me/fasberry" },
  discord: { variant: "redirect", content: "https://discord.gg/fasberry" },
  vk: { variant: "redirect", content: "https://vk.com/fasberry" },
}

const misc = new Elysia()
  .group("/misc", app => app
    .get("/:id", async ({ params: { id }, status, set }) => {
      const target = MISC_FILES[id]
      if (!target) {
        throw status(404, wrapError("NOT_FOUND"))
      }

      if (target.variant === 'redirect') {
        return redirect(target.content)
      }

      if (target.variant === 'static') {
        const data = await S3
          .getClient("static")
          .file(`misc/${target.content}`)
          .arrayBuffer()

        set.headers["Content-Type"] = "application/pdf"

        return data
      }

      throw status(404, wrapError("NOT_FOUND"))
    }, {
      response: {
        404: withError(
          t.UnionEnum(["NOT_FOUND"])
        )
      }
    })
  )

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
