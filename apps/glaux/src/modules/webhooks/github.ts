import { createHmac, timingSafeEqual } from "node:crypto"
import Elysia, { t } from "elysia"
import { getEnv } from "../../shared/env"
import { appLogger } from "../../shared/logger"
import { sendGithubPush, type GithubPushPayload } from "../../shared/notify/github"
import { redis } from "../../shared/redis/client"

const NOTIFY_REFS = new Set(["refs/heads/main", "refs/heads/dev"])
const MAX_BODY_BYTES = 1024 * 1024

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

export const githubWebhook = new Elysia()
	.post("/webhooks/github", async ({ body, headers, status }) => {
		const secret = getEnv().GITHUB_WEBHOOK_SECRET
		if (!secret) return status(503, "webhook is not configured")

		if (typeof body !== "string") return status(400, "invalid body")
		if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) return status(413, "payload too large")

		if (!verifySignature(secret, body, headers["x-hub-signature-256"])) {
			return status(401, "invalid signature")
		}

		if (headers["x-github-event"] !== "push") return status(202, "ignored")
		if (await isDuplicate(headers["x-github-delivery"])) return status(202, "duplicate")

		let payload: unknown
		try {
			payload = JSON.parse(body)
		} catch {
			return status(400, "invalid json")
		}

		if (typeof payload !== "object" || payload === null) return status(400, "invalid payload")

		const push = payload as GithubPushPayload
		const repos = getEnv().GITHUB_REPOS?.split(",").map((repo) => repo.trim()).filter(Boolean)

		if (repos?.length && !repos.includes(push.repository?.full_name ?? "")) {
			return status(202, "ignored")
		}

		if (push.deleted === true || typeof push.ref !== "string" || !NOTIFY_REFS.has(push.ref) || !push.head_commit) {
			return status(202, "ignored")
		}

		void sendGithubPush(push).catch((error) => {
			appLogger.error(`github webhook: fan-out failed: ${String(error)}`)
		})

		return status(202, "accepted")
	}, {
		parse: "text",
		body: t.String(),
		detail: {
			summary: "GitHub organization webhook for push notifications",
		},
	})
