import { timingSafeEqual } from "node:crypto"
import Elysia from "elysia"
import { getBuildMetricsDb } from "../../shared/database/build-metrics-db"
import { getEnv } from "../../shared/env"

/** Kysely instance for the metrics database, narrowed to a non-null value. */
export type MetricsDb = NonNullable<ReturnType<typeof getBuildMetricsDb>>

export function authorized(header: string | undefined, token: string): boolean {
  const prefix = "Bearer "
  if (!header?.startsWith(prefix)) return false

  const received = Buffer.from(header.slice(prefix.length))
  const expected = Buffer.from(token)

  return received.length === expected.length && timingSafeEqual(received, expected)
}

/**
 * Elysia pipe: the metrics token must be configured and the request must carry
 * it as a bearer token. Configuration problems are 503, auth failures are 401.
 */
export const requireMetricsToken = () => new Elysia({ name: "requireMetricsToken" })
  .derive({ as: "scoped" }, ({ status }) => {
    const token = getEnv().BUILD_METRICS_TOKEN
    if (!token) throw status(503, { error: "build metrics are not configured" })

    return { metricsToken: token }
  })
  .onBeforeHandle({ as: "scoped" }, ({ headers, metricsToken, status }) => {
    if (!authorized(headers.authorization, metricsToken)) {
      throw status(401, { error: "invalid token" })
    }
  })

/** Elysia pipe: exposes the metrics database or answers 503. */
export const requireMetricsDb = () => new Elysia({ name: "requireMetricsDb" })
  .derive({ as: "scoped" }, ({ status }) => {
    const db = getBuildMetricsDb()
    if (!db) throw status(503, { error: "build metrics are not configured" })

    return { metricsDb: db }
  })
