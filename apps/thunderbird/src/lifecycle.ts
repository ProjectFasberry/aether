import { defineLifecycle } from "@repo/core/utils/lifecycle";
import { printDatabases } from "@repo/core/utils/database";
import { defineVerbose } from "@repo/core/utils";
import { appLogger } from "./shared/constants/logger";
import { natsService } from "./shared/nats/client";
import { redisService } from "./shared/redis/client";
import { refreshDatabaseHealth } from "./shared/database/health";
import { urlsService } from "./shared/services/urls";
import { permissionsService } from "./shared/constants/permissions";
import { minioService } from "./shared/services/minio";
import { INTERNAl_FILES, loadInternalFiles } from "./shared/minio/utils";
import { psubscribe } from "./shared/redis/utils";
import { startJobs, stopJobs } from "./shared/cron/init";
import { getEnv } from "./shared/env";
import { ensureUrlConfig } from "./shared/services/config";
import { initOptionCache } from "./shared/constants/options";
import { SUBSCRIBERS } from "./events/registry";
import { initServiceState } from "./shared/services/service-state";
import { signingKeys } from "./modules/yggdrasil/signing-keys.model";
import { voteSites } from "./modules/server/votes/vote-sites.model";
import { beginShutdown } from "./shared/shutdown";

export const lifecycle = defineLifecycle()
  .add("db", {
    critical: true,
    timeoutMs: 20_000,
    start: () => refreshDatabaseHealth({
      failOnUnhealthy: true,
      onSuccess: (results) => {
        if (getEnv().verbose) {
          printDatabases(results);
        }
      },
    }),
  })
  .add("redis", {
    critical: true,
    timeoutMs: 15_000,
    start: async () => {
      await redisService.start();
      await psubscribe();
      await initOptionCache();
    },
    stop: () => redisService.close(),
  })
  .add("nats", {
    critical: true,
    timeoutMs: 15_000,
    start: () => natsService.start({ subscribers: SUBSCRIBERS }),
    stop: () => natsService.close(),
  })
  .add("shared", {
    critical: true,
    dependsOn: "db",
    start: async () => {
      await ensureUrlConfig();

      await urlsService.init({
        onError: (error) => appLogger.error({ message: "Urls error", error }),
        print: getEnv().verbose,
      });

      await permissionsService.init();
    },
  })
  .add("signing-keys", {
    critical: true,
    dependsOn: "db",
    start: () => signingKeys.ensure(),
  })
  .add("vote-sites", {
    critical: false,
    dependsOn: "db",
    start: () => voteSites.ensure(),
  })
  .add("minio", {
    critical: false,
    timeoutMs: 20_000,
    start: () => minioService.start({
      onAfterStart: (client) => loadInternalFiles(client, INTERNAl_FILES),
    })
  })
  .add("service-state", {
    critical: false,
    dependsOn: "redis",
    start: () => initServiceState(),
  })
  .add("jobs", {
    critical: false,
    dependsOn: ["db", "redis"],
    start: () => startJobs(),
    stop: () => stopJobs(),
  })
  .add("app", {
    critical: true,
    dependsOn: ["db", "redis", "nats", "shared", "signing-keys", "minio", "service-state", "jobs"],
    start: async () => {
      const { appService } = await import("#/app");
      return appService.start()
    },
    stop: async (app) => {
      await app.stop(true);
    },
  })
  .build({
    name: "thunderbird",
    onStopping: beginShutdown,
  });

export const preboot = () => {
  Object.assign(getEnv(), { verbose: defineVerbose() });
};