import { beforeEach, describe, expect, it } from "bun:test"
import { installGlauxMocks, resetState } from "./__tests__/harness"

installGlauxMocks()

const { app } = await import("./app")

const get = (path: string) => app.handle(new Request(`http://localhost${path}`))

beforeEach(() => {
	resetState()
})

describe("root routes", () => {
	it("serves the healthcheck as a plain OK", async () => {
		const response = await get("/health")

		expect(response.status).toBe(200)
		expect(await response.text()).toBe("OK")
	})

	it("serves an empty favicon response", async () => {
		const response = await get("/favicon.ico")

		expect(response.status).toBe(200)
		expect(await response.text()).toBe("")
	})

	it("serves the preview page", async () => {
		const response = await get("/")

		expect(response.status).toBe(200)
		expect(response.headers.get("content-type")).toContain("text/html")
		expect(await response.text()).toContain("<title>Glaux API</title>")
	})

	it("returns a JSON 404 for unknown routes", async () => {
		const response = await get("/missing")

		expect(response.status).toBe(404)
		expect(response.headers.get("content-type")).toContain("application/json")
		expect(await response.json()).toEqual({ error: "Not found" })
	})

	it("treats a wrong method as not found", async () => {
		const response = await app.handle(new Request("http://localhost/health", { method: "POST" }))

		expect(response.status).toBe(404)
		expect(await response.json()).toEqual({ error: "Not found" })
	})
})

describe("OpenAPI contract", () => {
	it("publishes response contracts for the service routes", async () => {
		const response = await get("/openapi/json")
		const spec = await response.json() as {
			paths: Record<string, Record<string, { responses?: Record<string, unknown> }>>
		}

		expect(response.status).toBe(200)

		const metricsPost = spec.paths["/metrics/build"]?.post
		const metricsGet = spec.paths["/metrics/build"]?.get
		const github = spec.paths["/webhooks/github"]?.post

		expect(Object.keys(metricsPost?.responses ?? {})).toEqual(
			expect.arrayContaining(["201", "401", "500", "503"]),
		)
		expect(Object.keys(metricsGet?.responses ?? {})).toEqual(
			expect.arrayContaining(["200", "500", "503"]),
		)
		// The GitHub webhook intentionally documents only its success path.
		expect(github).toBeDefined()
	})
})
