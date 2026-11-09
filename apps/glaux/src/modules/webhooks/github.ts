import Elysia, { t } from "elysia"
import { sendGithubPush } from "../../shared/notify/github"
import { appLogger } from "../../shared/logger"
import { githubWebhookGuard } from "../../lib/guards/github"

export const githubWebhook = new Elysia()
  .use(githubWebhookGuard())
  .post("/webhooks/github", ({ githubPush, githubSkip, status }) => {
    if (!githubPush) return status(202, githubSkip ?? "ignored")

    void sendGithubPush(githubPush).catch((e) => {
      appLogger.error(`github webhook: fan-out failed: ${String(e)}`)
    })

    return status(202, "accepted")
  }, {
    parse: "text",
    body: t.String(),
    detail: {
      summary: "GitHub organization webhook for push notifications",
    },
  })
