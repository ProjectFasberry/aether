import { createBootstrap, definePipe } from "@repo/core/utils/boot";
import { appLogger } from "./shared/constants/logger";
import { natsService } from "./shared/nats/client";
import { redisService } from "./shared/redis/client";
import { checkDatabasesHealth, printDatabases } from "@repo/core/utils/database";
import { urlsService } from "./shared/services/urls";
import { permissionsService } from "./shared/constants/permissions";
import { defineVerbose, taskWithTimeout } from "@repo/core/utils";
import { minioService } from "./shared/services/minio";
import { INTERNAl_FILES, loadInternalFiles } from "./shared/minio/utils";
import { psubscribe } from "./shared/redis/utils";
import { startJobs } from "./shared/cron/init";
import { DATABASES_FOR_CHECK } from "./shared/database";
import { getEnv } from "./shared/env";

export async function shutdown({ signal }: { signal: string }) {
  appLogger.info(`Received ${signal}. Starting graceful shutdown...`);
  setTimeout(() => process.exit(1), 10000).unref();

  await Promise.allSettled([
    natsService.close(),
    redisService.close(),
  ]);

  appLogger.info("All connections closed. Bye!");
  process.exit(0);
};

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
    run: async () => {
      const logger = appLogger.child({ name: "urls" });

      await urlsService.init({
        onError: (error) => logger.error({ message: "Urls error", error }),
        print: true
      })

      await permissionsService.init()
    }
  }),
  definePipe("nats", {
    run: () => natsService.start(),
  }),
  definePipe("minio", {
    run: () => taskWithTimeout(() => minioService.start({
      onAfterStart: (client) => loadInternalFiles(client, INTERNAl_FILES),
    }), {
      timeout: 5000
    }),
    critical: false
  }),
  definePipe("redis", {
    run: async () => {
      await redisService.start()
      await psubscribe();
    },
  }),
  definePipe("jobs", {
    run: () => startJobs(),
  }),
]);

export const preboot = () => {
  Object.assign(getEnv(), { verbose: defineVerbose() });
}
