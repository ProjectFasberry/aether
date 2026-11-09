import { createHmac, timingSafeEqual } from "node:crypto"
import Elysia from "elysia"
import type { GithubPushPayload } from "../../shared/notify/github"
import { getEnv } from "../../shared/env"
import { appLogger } from "../../shared/logger"
import { redis } from "../../shared/redis/client"

const NOTIFY_REFS = new Set(["refs/heads/main", "refs/heads/dev"])
const MAX_BODY_BYTES = 1024 * 1024

export type GithubWebhookSkip = "ignored" | "duplicate"

export type GithubWebhookResult =
  | { githubPush: GithubPushPayload; githubSkip: null }
  | { githubPush: null; githubSkip: GithubWebhookSkip }

function verifySignature(secret: string, body: string, header: string | undefined): boolean {
  if (!header?.startsWith("sha256=")) return false

  const received = header.slice("sha256=".length)
  const expected = createHmac("sha256", secret).update(body).digest("hex")

  if (received.length !== expected.length) return false

  return timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex"))
}

async function isDuplicate(delivery: string | undefined): Promise<boolean> {
  if (!delivery) return false

  try {
    const created = await redis
      .getInstance()
      .set(`github:delivery:${delivery}`, "1", "EX", 60 * 60 * 24, "NX")

    return created === null
  } catch (error) {
    // Dedupe must not block a notification.
    appLogger.error(`github webhook: redis dedupe failed: ${String(error)}`)
    return false
  }
}

export const githubWebhookGuard = () => new Elysia({ name: "githubWebhookGuard" })
  .derive({ as: "scoped" }, async ({ body, headers, status }): Promise<GithubWebhookResult> => {
    const secret = getEnv().GITHUB_WEBHOOK_SECRET
    if (!secret) throw status(503, { error: "webhook is not configured" })

    if (typeof body !== "string") throw status(400, { error: "invalid body" })
    if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) {
      throw status(413, { error: "payload too large" })
    }

    if (!verifySignature(secret, body, headers["x-hub-signature-256"])) {
      throw status(401, { error: "invalid signature" })
    }

    if (headers["x-github-event"] !== "push") {
      return { githubPush: null, githubSkip: "ignored" }
    }

    if (await isDuplicate(headers["x-github-delivery"])) {
      return { githubPush: null, githubSkip: "duplicate" }
    }

    let payload: unknown
    try {
      payload = JSON.parse(body)
    } catch {
      throw status(400, { error: "invalid json" })
    }

    if (typeof payload !== "object" || payload === null) {
      throw status(400, { error: "invalid payload" })
    }

    const push = payload as GithubPushPayload
    const repos = getEnv().GITHUB_REPOS?.split(",").map((repo) => repo.trim()).filter(Boolean)

    if (repos?.length && !repos.includes(push.repository?.full_name ?? "")) {
      return { githubPush: null, githubSkip: "ignored" }
    }

    if (push.deleted === true || typeof push.ref !== "string" || !NOTIFY_REFS.has(push.ref) || !push.head_commit) {
      return { githubPush: null, githubSkip: "ignored" }
    }

    return { githubPush: push, githubSkip: null }
  })
