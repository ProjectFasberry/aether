import { createHmac } from "node:crypto"
import { beforeEach, describe, expect, it } from "bun:test"
import { installGlauxMocks, resetState, state } from "../../__tests__/harness"

installGlauxMocks()

const { app } = await import("../../app")

const SECRET = "webhook-secret"
const MAX_BODY_BYTES = 1024 * 1024

const pushPayload = {
	ref: "refs/heads/main",
	repository: { full_name: "ProjectFasberry/aether", html_url: "https://github.com/ProjectFasberry/aether" },
	sender: { login: "distribate" },
	head_commit: { message: "test commit", url: "https://github.com/ProjectFasberry/aether/commit/abc" },
}

function sign(body: string, secret = SECRET) {
	return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`
}

function deliver(body: string, {
	event = "push",
	signature,
	delivery,
}: {
	event?: string
	signature?: string | null
	delivery?: string
} = {}) {
	const headers: Record<string, string> = {
		"content-type": "application/json",
		"x-github-event": event,
	}

	if (signature !== null) headers["x-hub-signature-256"] = signature ?? sign(body)
	if (delivery) headers["x-github-delivery"] = delivery

	return app.handle(new Request("http://localhost/webhooks/github", {
		method: "POST",
		headers,
		body,
	}))
}

beforeEach(() => {
	resetState()
})

describe("POST /webhooks/github", () => {
	it("returns 503 when the secret is not configured", async () => {
		delete state.env.GITHUB_WEBHOOK_SECRET

		const response = await deliver(JSON.stringify(pushPayload))

		expect(response.status).toBe(503)
		expect(await response.json()).toEqual({ error: "webhook is not configured" })
	})

	it("returns 401 for a missing signature", async () => {
		const response = await deliver(JSON.stringify(pushPayload), { signature: null })

		expect(response.status).toBe(401)
		expect(await response.json()).toEqual({ error: "invalid signature" })
		expect(state.notifications).toHaveLength(0)
	})

	it("returns 401 for a wrong signature", async () => {
		const body = JSON.stringify(pushPayload)
		const response = await deliver(body, { signature: sign(`${body} `) })

		expect(response.status).toBe(401)
		expect(await response.json()).toEqual({ error: "invalid signature" })
	})

	it("ignores a non-push event before dedupe and parsing", async () => {
		const response = await deliver(JSON.stringify(pushPayload), { event: "ping" })

		expect(response.status).toBe(202)
		expect(await response.text()).toBe("ignored")
		expect(state.redis.keys.size).toBe(0)
		expect(state.notifications).toHaveLength(0)
	})

	it("accepts main and dev pushes and fans them out", async () => {
		const body = JSON.stringify(pushPayload)

		const main = await deliver(body, { delivery: "delivery-main" })
		expect(main.status).toBe(202)
		expect(await main.text()).toBe("accepted")

		const devBody = JSON.stringify({ ...pushPayload, ref: "refs/heads/dev" })
		const dev = await deliver(devBody, { delivery: "delivery-dev" })
		expect(dev.status).toBe(202)
		expect(await dev.text()).toBe("accepted")

		expect(state.notifications).toHaveLength(2)
		expect(state.notifications[0]).toMatchObject({ ref: "refs/heads/main" })
	})

	it("deduplicates a repeated delivery id", async () => {
		const body = JSON.stringify(pushPayload)

		const first = await deliver(body, { delivery: "same-delivery" })
		const second = await deliver(body, { delivery: "same-delivery" })

		expect(await first.text()).toBe("accepted")
		expect(second.status).toBe(202)
		expect(await second.text()).toBe("duplicate")
		expect(state.notifications).toHaveLength(1)
	})

	it("does not deduplicate when Redis fails", async () => {
		state.redis.fail = true

		const response = await deliver(JSON.stringify(pushPayload), { delivery: "redis-down" })

		expect(response.status).toBe(202)
		expect(await response.text()).toBe("accepted")
		expect(state.notifications).toHaveLength(1)
	})

	it("returns 400 for invalid JSON", async () => {
		const response = await deliver("{not-json", { delivery: "invalid-json" })

		expect(response.status).toBe(400)
		expect(await response.json()).toEqual({ error: "invalid json" })
	})

	it("returns 400 for a null payload", async () => {
		const response = await deliver("null", { delivery: "null-payload" })

		expect(response.status).toBe(400)
		expect(await response.json()).toEqual({ error: "invalid payload" })
	})

	it("ignores a payload that is not a push object", async () => {
		const response = await deliver("[]", { delivery: "array-payload" })

		expect(response.status).toBe(202)
		expect(await response.text()).toBe("ignored")
	})

	it("ignores a repository outside the allowlist", async () => {
		state.env.GITHUB_REPOS = "ProjectFasberry/atlas, ProjectFasberry/aether"

		const allowed = await deliver(JSON.stringify(pushPayload), { delivery: "allowed" })
		expect(await allowed.text()).toBe("accepted")

		const other = JSON.stringify({
			...pushPayload,
			repository: { full_name: "someone/else" },
		})
		const blocked = await deliver(other, { delivery: "blocked" })
		expect(blocked.status).toBe(202)
		expect(await blocked.text()).toBe("ignored")

		expect(state.notifications).toHaveLength(1)
	})

	it("ignores branch deletion and branches other than main/dev", async () => {
		const deleted = await deliver(JSON.stringify({ ...pushPayload, deleted: true }), { delivery: "deleted" })
		expect(await deleted.text()).toBe("ignored")

		const feature = await deliver(JSON.stringify({ ...pushPayload, ref: "refs/heads/feature" }), { delivery: "feature" })
		expect(await feature.text()).toBe("ignored")

		const noCommit = await deliver(JSON.stringify({ ...pushPayload, head_commit: null }), { delivery: "no-commit" })
		expect(await noCommit.text()).toBe("ignored")

		expect(state.notifications).toHaveLength(0)
	})

	it("returns 413 for a body above one mebibyte", async () => {
		const response = await deliver("x".repeat(MAX_BODY_BYTES + 1))

		expect(response.status).toBe(413)
		expect(await response.json()).toEqual({ error: "payload too large" })
		expect(state.notifications).toHaveLength(0)
	})
})
