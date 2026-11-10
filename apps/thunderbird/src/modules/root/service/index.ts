import Elysia, { t } from "elysia";
import { withData, withError } from "#/shared/schemas";
import { defineBearer } from "#/lib/define";
import { buildRouteSummary } from "#/lib/routes";
import { cronTasks } from "#/shared/cron/init";
import { areRequiredDatabasesHealthy, getDatabaseHealth } from "#/shared/database/health";
import { wrapError } from "@repo/shared/lib/helpers"
import { isShuttingDown } from "#/shared/shutdown"

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
    .get("/", ({ status }) => {
      if (isShuttingDown()) return status(503, { error: "SHUTTING_DOWN" });

      return {
        data: {
          status: "OK",
          uptime: process.uptime(),
        }
      }
    }, {
      response: {
        200: withData(healthPayloadSchema),
        503: withError(t.UnionEnum(["SHUTTING_DOWN"]))
      },
      detail: {
        summary: buildRouteSummary("Get health")
      }
    })
    .use(defineBearer())
    .get("/ready", ({ status }) => {
      if (isShuttingDown()) return status(503, { error: "SHUTTING_DOWN" });

      const health = getDatabaseHealth();

      if (!health.ready || !areRequiredDatabasesHealthy()) {
        return status(503, wrapError("DB_UNAVAILABLE"));
      }

      return {
        data: {
          timestamp: new Date().toISOString(),
          services: {
            databases: health.databases
          }
        }
      }
    }, {
      response: {
        200: withData(healthReadySuccessSchema),
        503: withError(
          t.UnionEnum(["DB_CONNECTION_FAILED", "DB_UNAVAILABLE", "UNKNOWN", "SHUTTING_DOWN"])
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
              nextRunAt: t.Optional(t.Nullable(t.Union([t.Date(), t.String()]))),
              lastRunAt: t.Optional(t.Nullable(t.Union([t.Date(), t.String()]))),
              lastOutcome: t.Optional(t.Nullable(t.UnionEnum(["ran", "busy", "failed"]))),
              lastDurationMs: t.Optional(t.Nullable(t.Number())),
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
