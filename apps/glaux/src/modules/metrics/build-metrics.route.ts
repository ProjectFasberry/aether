import Elysia, { t } from "elysia"
import { Static } from "typebox"
import { appLogger } from "../../shared/logger"
import { withData, withError } from "../../helpers"
import { requireMetricsDb, requireMetricsToken, type MetricsDb } from "../../lib/guards/metrics"

const buildMetricsPayloadSchema = t.Object({
  app: t.String(),
  stage: t.String(),
  branch: t.String(),
  commitSha: t.String(),
  createdAt: t.String({ format: "date-time" }),
  metrics: t.Object({
    clientJsBytes: t.Number(),
    clientCssBytes: t.Number(),
    clientFontsBytes: t.Number(),
    clientImagesBytes: t.Number(),
    clientOtherBytes: t.Number(),
    serverJsBytes: t.Number(),
    totalBytes: t.Number(),
  })
})

const metricsSchema = t.Object({
  clientJsBytes: t.Number({ minimum: 0 }),
  clientCssBytes: t.Number({ minimum: 0 }),
  clientFontsBytes: t.Number({ minimum: 0 }),
  clientImagesBytes: t.Number({ minimum: 0 }),
  clientOtherBytes: t.Number({ minimum: 0 }),
  serverJsBytes: t.Number({ minimum: 0 }),
  totalBytes: t.Number({ minimum: 0 }),
})

const buildMetricsSchema = t.Object({
  app: t.Union([t.Literal("minotaur"), t.Literal("wiki"), t.Literal("taurus")]),
  stage: t.String({ minLength: 1 }),
  branch: t.String({ minLength: 1 }),
  commitSha: t.String({ minLength: 7 }),
  metrics: metricsSchema,
})

const buildMetricsQuerySchema = t.Object({
  app: t.Optional(t.String()),
  branch: t.Optional(t.String()),
  limit: t.Optional(t.Number()),
})

async function buildMetrics(db: MetricsDb, body: Static<typeof buildMetricsSchema>) {
  return db
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
    .onConflict((c) =>
      c.columns(["app", "stage", "branch", "commit_sha"]).doNothing()
    )
    .execute()
}

async function getMetrics(db: MetricsDb, raw: Static<typeof buildMetricsQuerySchema>) {
  const limit = Math.min(Math.max(Number(raw.limit ?? 200) || 200, 1), 500)

  let query = db
    .selectFrom("build_metrics")
    .selectAll()
    .orderBy("created_at", "desc")
    .limit(limit)

  if (raw.app) {
    query = query.where("app", "=", raw.app)
  }
  if (raw.branch) {
    query = query.where("branch", "=", raw.branch)
  }

  const rows = await query.execute()

  return rows.map((row) => ({
    app: row.app,
    stage: row.stage,
    branch: row.branch,
    commitSha: row.commit_sha,
    createdAt: row.created_at.toISOString(),
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
}

const postBuildMetrics = new Elysia()
  .use(requireMetricsToken())
  .use(requireMetricsDb())
  .post("/metrics/build", async ({ body, metricsDb, status }) => {
    try {
      await buildMetrics(metricsDb, body)
    } catch (e) {
      appLogger.error(`build metrics insert failed: ${String(e)}`)
      throw e
    }

    return status(201, { data: "OK" })
  }, {
    body: buildMetricsSchema,
    response: {
      201: withData(t.Literal("OK")),
      503: withError(),
      401: withError(),
      500: withError()
    },
    detail: {
      summary: "Store build output sizes for an atlas app",
    },
  })

const getBuildMetrics = new Elysia()
  .use(requireMetricsDb())
  .get("/metrics/build", async ({ query, metricsDb, status }) => {
    try {
      return status(200, { data: await getMetrics(metricsDb, query) })
    } catch (e) {
      appLogger.error(`build metrics get failed: ${String(e)}`)
      throw e
    }
  }, {
    query: buildMetricsQuerySchema,
    response: {
      200: withData(t.Array(buildMetricsPayloadSchema)),
      503: withError(),
      500: withError()
    },
    detail: {
      summary: "List stored build sizes for charts",
    },
  })

export const buildMetricsRoute = new Elysia()
  .use(postBuildMetrics)
  .use(getBuildMetrics)
