import Elysia, { t } from "elysia"
import { sendGithubPush, sendGithubWorkflowRun } from "../../shared/notify/github"
import { appLogger } from "../../shared/logger"
import { githubWebhookGuard } from "../../lib/guards/github"

export const githubWebhook = new Elysia()
  .use(githubWebhookGuard())
  .post("/webhooks/github", ({ githubPush, githubRun, githubSkip, status }) => {
    if (githubSkip) return status(202, githubSkip)

    const delivery = githubPush
      ? sendGithubPush(githubPush)
      : githubRun
        ? sendGithubWorkflowRun(githubRun)
        : null

    if (!delivery) return status(202, "ignored")

    void delivery.catch((e) => {
      appLogger.error(`github webhook: fan-out failed: ${String(e)}`)
    })

    return status(202, "accepted")
  }, {
    parse: "text",
    body: t.String(),
    detail: {
      summary: "GitHub organization webhook for pushes and failed workflow runs",
    },
  })
