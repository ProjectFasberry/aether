import Elysia, { t } from "elysia";
import { withData, withError } from "#/shared/schemas";
import { checkDatabasesHealth, healthCheckResultSchema } from "#/shared/database/init";
import { defineBearer } from "#/lib/define";
import { wrapError } from "#/helpers/wrap-error";
import { cronTasks } from "#/shared/cron/init";

const healthPayloadSchema = t.Object({
  status: t.Literal("OK"),
  uptime: t.Number(),
  memory: t.Object({
    rss: t.Number(),
    heapTotal: t.Number(),
    heapUsed: t.Number(),
    external: t.Number(),
    arrayBuffers: t.Number()
  }),
  availableMemory: t.Number(),
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
        memory: process.memoryUsage(),
        availableMemory: process.availableMemory()
      }
    }), {
      response: {
        200: withData(healthPayloadSchema)
      }
    })
    .use(defineBearer())
    .get("/ready", async ({ status }) => {
      try {
        const databases = await checkDatabasesHealth().catch(() => {
          throw new Error("DB_CONNECTION_FAILED")
        });

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
      tags: ["authorized"]
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
      }
    })
  );
