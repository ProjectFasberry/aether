import "./assign";

import { redis } from "./shared/redis/client";
import { chats } from "./shared/bot/chats";
import { bot } from "./shared/bot";
import { urlsService } from "./shared/bot/urls";
import { handleProcessOnEvent } from "./shared/utils/handle-log";
import { nats } from "./shared/nats/client";
import { getEnv } from "./shared/env";
import { minioService } from "./shared/minio/client";
import { createBootstrap, type BootstrapStep } from "@repo/core/utils/boot";
import { isError } from "@repo/shared/lib/helpers";
import { appLogger, logger } from "./shared/logger";
import { checkDatabasesHealth, printDatabases } from "@repo/core/utils/database";
import { DATABASES_FOR_CHECK } from "./shared/database";
import { taskWithTimeout } from "@repo/core/utils";
import { defineVerbose } from "@repo/core/utils";

const verbose = defineVerbose();

const pipeline: BootstrapStep[] = [
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
    critical: true,
    run: async () => {
      await chats.init();

      await urlsService.init({
        onError: (error) => logger.error({ message: "Urls error", error }),
        print: true
      })
    }
  },
  {
    name: "redis",
    run: () => redis.init(),
  },
  {
    name: "nats",
    run: () => nats.start(),
  },
  {
    name: "minio",
    run: () => taskWithTimeout(() => minioService.start(), {
      timeout: 5000
    }),
    critical: false
  },
  {
    name: "bot",
    run: () => taskWithTimeout(() => bot.start(), {
      timeout: 3000,
      fallback: () => {
        logger.error({ message: "Bot start timeout" });
      }
    })
  }
];

const boot = createBootstrap(pipeline);

try {
  await boot.start();

  const { startApp } = await import("./app");
  startApp({ verbose });
} catch (e) {
  if (!getEnv().PROD) {
    console.error(e)
  }
  Promise.reject(isError(e) ? e : new Error("UNKNOWN"));
}

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

process
  .on("uncaughtException", (error) => handleProcessOnEvent("uncaughtException", { error }))
  .on("unhandledRejection", (error) => handleProcessOnEvent("unhandledRejection", { error }))
  .on("rejectionHandled", (error) => handleProcessOnEvent("rejectionHandled", { kill: false, error }))
  .on("warning", (error) => handleProcessOnEvent("warning", { error }))
  .on("SIGTERM", () => shutdown("SIGTERM"))
  .on("SIGINT", () => shutdown("SIGINT"));
