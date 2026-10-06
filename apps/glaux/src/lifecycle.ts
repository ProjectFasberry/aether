import { taskWithTimeout } from "@repo/core/utils";
import { defineVerbose } from "@repo/core/utils";
import { createBootstrap, definePipe } from "@repo/core/utils/boot";
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

export const preboot = () => {
  Object.assign(getEnv(), { verbose: defineVerbose() })
}

export const boot = createBootstrap([
  definePipe("db-health", {
    critical: true,
    run: async () => {
      const logger = appLogger.child({ name: "db-health" });

      await checkDatabasesHealth(DATABASES_FOR_CHECK, {
        onSuccess: (results) => printDatabases(results),
        verbose: getEnv().verbose,
        onError: (e) => logger.error(e),
      });
    },
  }),
  definePipe("shared-modules", {
    critical: true,
    run: async () => {
      await chats.init();

      await urlsService.init({
        onError: (error) => logger.error({ message: "Urls error", error }),
        print: true
      })
    }
  }),
  definePipe("redis", {
    run: () => redis.init(),
  }),
  definePipe("nats", {
    run: () => natsService.start(),
  }),
  definePipe("minio", {
    run: () => taskWithTimeout(() => minioService.start(), {
      timeout: 5000
    }),
    critical: false
  }),
  definePipe("bot", {
    run: () => taskWithTimeout(() => bot.start(), {
      timeout: 3000,
      fallback: () => {
        logger.error({ message: "Bot start timeout" });
      }
    })
  }),
]);

export async function shutdown({ signal }: { signal: string }) {
  appLogger.info(`Received ${signal}. Starting graceful shutdown...`);
  setTimeout(() => process.exit(1), 10000).unref();

  await Promise.allSettled([
    natsService.close(),
    redis.close(),
  ]);

  appLogger.info("All connections closed. Bye!");
  process.exit(0);
};
