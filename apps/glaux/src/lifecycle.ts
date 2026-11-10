import { defineLifecycle } from "@repo/core/utils/lifecycle";
import { defineVerbose } from "@repo/core/utils";
import { checkDatabasesHealth, printDatabases } from "@repo/core/utils/database";
import { redis } from "./shared/redis/client";
import { chats } from "./shared/bot/chats";
import { bot } from "./shared/bot";
import { urlsService } from "./shared/bot/urls";
import { natsService } from "./shared/nats/client";
import { minioService } from "./shared/minio/client";
import { appLogger, logger } from "./shared/logger";
import { DATABASES_FOR_CHECK } from "./shared/database";
import { getEnv } from "./shared/env";
import { ensureBuildMetricsTable } from "./shared/database/build-metrics-db";
import { initServiceState } from "./shared/services/service-state";
import { beginShutdown } from "./shared/shutdown";

export const lifecycle = defineLifecycle()
  .add("db", {
    critical: true,
    timeoutMs: 20_000,
    start: async () => {
      const dbLogger = appLogger.child({ name: "db-health" });

      await checkDatabasesHealth(DATABASES_FOR_CHECK, {
        onSuccess: (results) => printDatabases(results),
        verbose: getEnv().verbose,
        onError: (error) => dbLogger.error(error),
      });
    },
  })
  .add("shared", {
    critical: true,
    dependsOn: "db",
    start: async () => {
      await chats.init();

      await urlsService.init({
        onError: (error) => logger.error({ message: "Urls error", error }),
        print: true,
      });
    },
  })
  .add("redis", {
    critical: true,
    timeoutMs: 15_000,
    start: () => redis.init(),
    stop: () => redis.close(),
  })
  .add("build-metrics", {
    critical: false,
    start: () => ensureBuildMetricsTable(),
  })
  .add("service-state", {
    critical: false,
    dependsOn: "redis",
    start: () => initServiceState(),
  })
  .add("nats", {
    critical: true,
    timeoutMs: 15_000,
    start: () => natsService.start(),
    stop: () => natsService.close(),
  })
  .add("minio", {
    critical: false,
    timeoutMs: 5_000,
    start: () => minioService.start(),
  })
  .add("bot", {
    critical: true,
    timeoutMs: 15_000,
    start: () => bot.start()
  })
  .add("app", {
    critical: true,
    dependsOn: ["db", "shared", "redis", "nats", "minio", "bot"],
    start: async () => {
      const { appService } = await import("#/app");
      return appService.start()
    },
    stop: async (app) => {
      await app.stop(true);
    },
  })
  .build({
    name: "glaux",
    onStopping: beginShutdown,
  });

export const preboot = () => {
  Object.assign(getEnv(), { verbose: defineVerbose() });
};
