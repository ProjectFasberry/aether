import Elysia, { t } from "elysia";
import { withData, withError } from "#/shared/schemas";
import { defineBearer } from "#/lib/define";
import { buildRouteSummary, wrapError } from "#/utils";
import { cronTasks } from "#/shared/cron/init";
import { checkDatabasesHealth, type HealthCheckResult } from "@repo/core/utils/database";
import { DATABASES_FOR_CHECK } from "#/shared/database";

const healthCheckResultSchema = t.Object({
  name: t.String(),
  dialect: t.UnionEnum(["mysql", "postgres", "mariadb"]),
  healthy: t.Boolean(),
  error: t.Optional(t.Unknown()),
})

const healthPayloadSchema = t.Object({
  status: t.Literal("OK"),
  uptime: t.Number(),
})

const healthReadySuccessSchema = t.Object({
  timestamp: t.String(),
  services: t.Object({
    databases: t.Array(healthCheckResultSchema)
  })
})

export const health = new Elysia()
  .group("/health", app => app
    .get("/", () => ({
      data: {
        status: "OK",
        uptime: process.uptime(),
      }
    }), {
      response: {
        200: withData(healthPayloadSchema)
      },
      detail: {
        summary: buildRouteSummary("Get health")
      }
    })
    .use(defineBearer())
    .get("/ready", async ({ status }) => {
      try {
        let databases: HealthCheckResult[] = []

        await checkDatabasesHealth({
          databases: DATABASES_FOR_CHECK,
          onSuccess: (results) => {
            databases = results
          }
        })

        return {
          data: {
            timestamp: new Date().toISOString(),
            services: {
              databases
            }
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "UNKNOWN";
        return status(503, wrapError(msg))
      }
    }, {
      response: {
        200: withData(healthReadySuccessSchema),
        503: withError(
          t.UnionEnum(["DB_CONNECTION_FAILED", "UNKNOWN"])
        )
      },
      tags: ["authorized"],
      detail: {
        summary: buildRouteSummary("Get ready")
      }
    })
  )

export const service = new Elysia()
  .group("/service", (app) => app
    .use(defineBearer())
    .get("/cron", async () => {
      const data = [...cronTasks].map(([k, v]) => ({ name: k, ...v }));
      return { data };
    }, {
      response: {
        200: withData(
          t.Array(
            t.Object({
              immediately: t.Boolean(),
              schedule: t.Boolean(),
              allowIsDev: t.Optional(t.Boolean()),
              scheduledTo: t.Union([t.Date(), t.String()]),
              name: t.String()
            })
          )
        )
      },
      tags: ["authorized"],
      detail: {
        summary: buildRouteSummary("Get cron tasks")
      }
    })
  );
