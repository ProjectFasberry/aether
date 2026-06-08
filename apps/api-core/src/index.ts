import "../imports";
import "../declare.d.ts";
import "./assign";

import { handleProcessOnEvent } from "./utils/config/handle-log";
import { urlsService } from "./shared/constants/urls";
import { permissions } from "./shared/constants/permissions";
import { minio } from "./shared/minio/client";
import { redis } from "./shared/redis/client";
import { rcon } from "./shared/rcon/client";
import { psubscribe } from "./shared/redis/subscribers";
import { nats } from "./shared/nats/client";
import { appLogger } from "./shared/constants/logger";
import { startJobs } from "./shared/cron/init";
import { INTERNAl_FILES, loadInternalFiles } from "./utils/minio/load-internal-files";
import { isError } from "@repo/shared/lib/helpers";
import { createBootstrap, type BootstrapStep } from "@repo/core/utils/boot"
import { checkDatabasesHealth, printDatabases } from "@repo/core/utils/database";
import { DATABASES_FOR_CHECK } from "./shared/database";
import { isProduction } from "./shared/env";

const bootstrapPipeline: BootstrapStep[] = [
  {
    name: "db-health",
    run: () => {
      const logger = appLogger.withTag("db-health");

      return checkDatabasesHealth({
        databases: DATABASES_FOR_CHECK,
        onSuccess: (results) => {
          printDatabases(logger, results)
        },
        verbose: !isProduction,
        onFailure: (e) => {
          logger.error(e)
          process.exit(1)
        },
      })
    }
  },
  {
    name: "urls",
    run: () => urlsService.init()
  },
  {
    name: "permissions",
    run: () => permissions.init()
  },
  {
    name: "rcon",
    run: () => rcon.connect()
  },
  {
    name: "nats",
    run: () => nats.start()
  },
  {
    name: "minio",
    run: () => minio.start({
      onAfterStart: async () => {
        await loadInternalFiles(INTERNAl_FILES)
      },
      showBuckets: true
    })
  },
  {
    name: "redis",
    run: () => redis.start()
  },
  {
    name: "psubscribe",
    run: () => psubscribe()
  },
  {
    name: "jobs",
    run: () => startJobs()
  }
];

const boot = createBootstrap(bootstrapPipeline)

const shutdown = async (signal: string) => {
  appLogger.log(`Received ${signal}. Starting graceful shutdown...`);
  setTimeout(() => process.exit(1), 10000).unref();

  await Promise.allSettled([
    nats.close(),
    redis.close(),
    rcon.disconnect(),
  ]);

  appLogger.log("All connections closed. Bye!");
  process.exit(0);
};

try {
  await boot.start();

  const { startApp } = await import("./app");
  startApp();
} catch (e) {
  Promise.reject(isError(e) ? e : new Error("UNKNOWN"));
}

process
  .on("uncaughtException", (error) => handleProcessOnEvent("uncaughtException", { error }))
  .on("unhandledRejection", (error) => handleProcessOnEvent("unhandledRejection", { error }))
  .on("rejectionHandled", (error) => handleProcessOnEvent("rejectionHandled", { kill: false, error }))
  .on("warning", (error) => handleProcessOnEvent("warning", { error }))
  .on("SIGTERM", () => shutdown("SIGTERM"))
  .on("SIGINT", () => shutdown("SIGINT"))
