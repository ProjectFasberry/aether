import { beforeEach, describe, expect, it } from "bun:test"
import { installGlauxMocks, resetState, state } from "../../__tests__/harness"

installGlauxMocks()

const { appService } = await import("../../app")

const validPayload = {
	app: "minotaur",
	stage: "prod",
	branch: "main",
	commitSha: "0123456789abcdef",
	createdAt: "2026-01-01T00:00:00.000Z",
	metrics: {
		clientJsBytes: 1,
		clientCssBytes: 2,
		clientFontsBytes: 3,
		clientImagesBytes: 4,
		clientOtherBytes: 5,
		serverJsBytes: 6,
		totalBytes: 21,
	},
}

const post = (body: unknown, headers: Record<string, string> = {}) =>
	appService.get().handle(new Request("http://localhost/metrics/build", {
		method: "POST",
		headers: { "content-type": "application/json", ...headers },
		body: typeof body === "string" ? body : JSON.stringify(body),
	}))

const get = (query = "") =>
	appService.get().handle(new Request(`http://localhost/metrics/build${query}`))

const bearer = { authorization: "Bearer metrics-token" }

beforeEach(() => {
	resetState()
})

describe("POST /metrics/build", () => {
	it("returns 503 when the token is not configured", async () => {
		delete state.env.BUILD_METRICS_TOKEN

		const response = await post(validPayload)

		expect(response.status).toBe(503)
		expect(await response.json()).toEqual({ error: "build metrics are not configured" })
	})

	it("returns 401 for a missing or wrong token", async () => {
		const missing = await post(validPayload)
		const wrong = await post(validPayload, { authorization: "Bearer nope" })

		expect(missing.status).toBe(401)
		expect(await missing.json()).toEqual({ error: "invalid token" })
		expect(wrong.status).toBe(401)
		expect(await wrong.json()).toEqual({ error: "invalid token" })
	})

	it("stores the payload and returns the data envelope", async () => {
		const response = await post(validPayload, bearer)

		expect(response.status).toBe(201)
		expect(await response.json()).toEqual({ data: "OK" })
		expect(state.metrics.inserted).toEqual([{
			app: "minotaur",
			stage: "prod",
			branch: "main",
			commit_sha: "0123456789abcdef",
			client_js_bytes: 1,
			client_css_bytes: 2,
			client_fonts_bytes: 3,
			client_images_bytes: 4,
			client_other_bytes: 5,
			server_js_bytes: 6,
			total_bytes: 21,
		}])
	})

	it("ignores the createdAt field from the producer", async () => {
		const response = await post({ ...validPayload, createdAt: "1999-01-01T00:00:00.000Z" }, bearer)

		expect(response.status).toBe(201)
		expect(state.metrics.inserted).toHaveLength(1)
		expect(state.metrics.inserted[0]).not.toHaveProperty("createdAt")
	})

	it("returns 503 when the database is not configured", async () => {
		state.metrics.configured = false

		const response = await post(validPayload, bearer)

		expect(response.status).toBe(503)
		expect(await response.json()).toEqual({ error: "build metrics are not configured" })
	})

	it("returns 500 when the insert fails", async () => {
		state.metrics.failInsert = true

		const response = await post(validPayload, bearer)

		expect(response.status).toBe(500)
		expect(await response.json()).toEqual({ error: "INTERNAL_SERVER_ERROR" })
	})

	it("rejects an unknown app before reaching the database", async () => {
		const response = await post({ ...validPayload, app: "unknown" }, bearer)

		expect(response.status).toBe(422)
		expect(await response.json()).toEqual({ error: "VALIDATION" })
		expect(state.metrics.inserted).toHaveLength(0)
	})

	it("rejects a short commitSha", async () => {
		const response = await post({ ...validPayload, commitSha: "abc" }, bearer)

		expect(response.status).toBe(422)
		expect(await response.json()).toEqual({ error: "VALIDATION" })
		expect(state.metrics.inserted).toHaveLength(0)
	})
})

describe("GET /metrics/build", () => {
	it("maps rows to the response contract", async () => {
		state.metrics.rows = [{
			app: "minotaur",
			stage: "prod",
			branch: "main",
			commit_sha: "0123456789abcdef",
			created_at: new Date("2026-01-02T03:04:05.000Z"),
			client_js_bytes: "10" as unknown as number,
			client_css_bytes: "20" as unknown as number,
			client_fonts_bytes: 30,
			client_images_bytes: 40,
			client_other_bytes: 50,
			server_js_bytes: 60,
			total_bytes: 210,
		}]

		const response = await get()
		const body = await response.json()

		expect(response.status).toBe(200)
		expect(body).toEqual({
			data: [{
				app: "minotaur",
				stage: "prod",
				branch: "main",
				commitSha: "0123456789abcdef",
				createdAt: "2026-01-02T03:04:05.000Z",
				metrics: {
					clientJsBytes: 10,
					clientCssBytes: 20,
					clientFontsBytes: 30,
					clientImagesBytes: 40,
					clientOtherBytes: 50,
					serverJsBytes: 60,
					totalBytes: 210,
				},
			}],
		})
	})

	it("returns an empty list", async () => {
		const response = await get()

		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({ data: [] })
	})

	it("passes app and branch filters to the query", async () => {
		await get("?app=wiki&branch=dev")

		expect(state.metrics.filters).toEqual([
			["app", "wiki"],
			["branch", "dev"],
		])
	})

	it("defaults the limit to 200 and clamps it to 1..500", async () => {
		await get()
		expect(state.metrics.lastLimit).toBe(200)

		await get("?limit=300")
		expect(state.metrics.lastLimit).toBe(300)

		await get("?limit=9000")
		expect(state.metrics.lastLimit).toBe(500)

		await get("?limit=-5")
		expect(state.metrics.lastLimit).toBe(1)

		// `0` is falsy, so the handler falls back to the default instead of 1.
		await get("?limit=0")
		expect(state.metrics.lastLimit).toBe(200)

		await get("?limit=abc")
		expect(state.metrics.lastLimit).toBe(200)
	})

	it("returns 503 when the database is not configured", async () => {
		state.metrics.configured = false

		const response = await get()

		expect(response.status).toBe(503)
		expect(await response.json()).toEqual({ error: "build metrics are not configured" })
	})

	it("returns 500 when the query fails", async () => {
		state.metrics.failSelect = true

		const response = await get()

		expect(response.status).toBe(500)
		expect(await response.json()).toEqual({ error: "INTERNAL_SERVER_ERROR" })
	})
})
