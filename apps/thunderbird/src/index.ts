import "../imports";
import "../declare.d.ts";
import "./assign";

// import "./shared/instrumentation"

import { handleProcessOnEvent } from "./utils/config/handle-log";
import { urlsService } from "./shared/services/urls";
import { permissions } from "./shared/constants/permissions";
import { redis } from "./shared/redis/client";
import { nats } from "./shared/nats/client";
import { appLogger } from "./shared/constants/logger";
import { startJobs } from "./shared/cron/init";
import { INTERNAl_FILES, loadInternalFiles } from "./shared/minio/utils";
import { isError } from "@repo/shared/lib/helpers";
import { createBootstrap, type BootstrapStep } from "@repo/core/utils/boot";
import { checkDatabasesHealth, printDatabases } from "@repo/core/utils/database";
import { DATABASES_FOR_CHECK } from "./shared/database";
import { minioService } from "./shared/services/minio";
import { psubscribe } from "./shared/redis/utils";
import { taskWithTimeout } from "@repo/core/utils";
import { defineVerbose } from "@repo/core/utils";

const verbose = defineVerbose();

const bootstrapPipeline: BootstrapStep[] = [
  {
    name: "db-health",
    critical: true,
    run: async () => {
      const logger = appLogger.child({ name: "db-health" });

      await checkDatabasesHealth(DATABASES_FOR_CHECK, {
        onSuccess: (results) => printDatabases(results),
        verbose,
        onError: (e) => logger.error(e),
      });
    },
  },
  {
    name: "shared-modules",
    run: async () => {
      const logger = appLogger.child({ name: "urls" });

      await urlsService.init({
        onError: (error) => logger.error({ message: "Urls error", error }),
        print: true
      })

      await permissions.init()
    }
  },
  {
    name: "nats",
    run: () => nats.start(),
  },
  {
    name: "minio",
    run: () => taskWithTimeout(() => minioService.start({
      onAfterStart: (client) => loadInternalFiles(client, INTERNAl_FILES),
    }), {
      timeout: 5000
    }),
    critical: false
  },
  {
    name: "redis",
    run: async () => {
      await redis.start()
      await psubscribe();
    },
  },
  {
    name: "jobs",
    run: () => startJobs(),
  },
];

const boot = createBootstrap(bootstrapPipeline);

const shutdown = async (signal: string) => {
  appLogger.info(`Received ${signal}. Starting graceful shutdown...`);
  setTimeout(() => process.exit(1), 10000).unref();

  await Promise.allSettled([
    nats.close(),
    redis.close(),
  ]);

  appLogger.info("All connections closed. Bye!");
  process.exit(0);
};

try {
  await boot.start();

  const { startApp } = await import("./app");
  startApp({ verbose });
} catch (e) {
  Promise.reject(isError(e) ? e : new Error("UNKNOWN"));
}

process
  .on("uncaughtException", (error) => handleProcessOnEvent("uncaughtException", { error }))
  .on("unhandledRejection", (error) => handleProcessOnEvent("unhandledRejection", { error }))
  .on("rejectionHandled", (error) => handleProcessOnEvent("rejectionHandled", { kill: false, error }))
  .on("warning", (error) => handleProcessOnEvent("warning", { error }))
  .on("SIGTERM", () => shutdown("SIGTERM"))
  .on("SIGINT", () => shutdown("SIGINT"));
