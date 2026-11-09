import { timingSafeEqual } from "node:crypto"
import Elysia, { t } from "elysia"
import { getBuildMetricsDb } from "../../shared/database/build-metrics-db"
import { getEnv } from "../../shared/env"
import { appLogger } from "../../shared/logger"

const metricsSchema = t.Object({
	clientJsBytes: t.Number({ minimum: 0 }),
	clientCssBytes: t.Number({ minimum: 0 }),
	clientFontsBytes: t.Number({ minimum: 0 }),
	clientImagesBytes: t.Number({ minimum: 0 }),
	clientOtherBytes: t.Number({ minimum: 0 }),
	serverJsBytes: t.Number({ minimum: 0 }),
	totalBytes: t.Number({ minimum: 0 }),
})

const payloadSchema = t.Object({
	app: t.Union([t.Literal("minotaur"), t.Literal("wiki"), t.Literal("taurus")]),
	stage: t.String({ minLength: 1 }),
	branch: t.String({ minLength: 1 }),
	commitSha: t.String({ minLength: 7 }),
	metrics: metricsSchema,
})

function authorized(header: string | undefined, token: string): boolean {
	const prefix = "Bearer "
	if (!header?.startsWith(prefix)) return false

	const received = Buffer.from(header.slice(prefix.length))
	const expected = Buffer.from(token)

	return received.length === expected.length && timingSafeEqual(received, expected)
}

export const buildMetricsRoute = new Elysia()
	.post("/metrics/build", async ({ body, headers, status }) => {
		const token = getEnv().BUILD_METRICS_TOKEN
		const db = getBuildMetricsDb()

		if (!token || !db) return status(503, "build metrics are not configured")
		if (!authorized(headers.authorization, token)) return status(401, "invalid token")

		try {
			await db
				.insertInto("build_metrics")
				.values({
					app: body.app,
					stage: body.stage,
					branch: body.branch,
					commit_sha: body.commitSha,
					client_js_bytes: body.metrics.clientJsBytes,
					client_css_bytes: body.metrics.clientCssBytes,
					client_fonts_bytes: body.metrics.clientFontsBytes,
					client_images_bytes: body.metrics.clientImagesBytes,
					client_other_bytes: body.metrics.clientOtherBytes,
					server_js_bytes: body.metrics.serverJsBytes,
					total_bytes: body.metrics.totalBytes,
				})
				.onConflict((conflict) => conflict.columns(["app", "stage", "branch", "commit_sha"]).doNothing())
				.execute()

			return status(201, "OK")
		} catch (error) {
			appLogger.error(`build metrics insert failed: ${String(error)}`)
			return status(500, "INTERNAL_SERVER_ERROR")
		}
	}, {
		body: payloadSchema,
		detail: {
			summary: "Store build output sizes for an atlas app",
		},
	})
	.get("/metrics/build", async ({ query, status }) => {
		const db = getBuildMetricsDb()
		if (!db) return status(503, "build metrics are not configured")

		const limit = Math.min(Math.max(Number(query.limit ?? 200) || 200, 1), 500)
		let request = db
			.selectFrom("build_metrics")
			.selectAll()
			.orderBy("created_at", "desc")
			.limit(limit)

		if (query.app) request = request.where("app", "=", query.app)
		if (query.branch) request = request.where("branch", "=", query.branch)

		const rows = await request.execute()

		return rows.map((row) => ({
			app: row.app,
			stage: row.stage,
			branch: row.branch,
			commitSha: row.commit_sha,
			createdAt: row.created_at,
			metrics: {
				clientJsBytes: Number(row.client_js_bytes),
				clientCssBytes: Number(row.client_css_bytes),
				clientFontsBytes: Number(row.client_fonts_bytes),
				clientImagesBytes: Number(row.client_images_bytes),
				clientOtherBytes: Number(row.client_other_bytes),
				serverJsBytes: Number(row.server_js_bytes),
				totalBytes: Number(row.total_bytes),
			},
		}))
	}, {
		query: t.Object({
			app: t.Optional(t.String()),
			branch: t.Optional(t.String()),
			limit: t.Optional(t.String()),
		}),
		detail: {
			summary: "List stored build sizes for charts",
		},
	})

