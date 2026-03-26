import "../imports"
import "../declare.d.ts"

import { handleFatalError } from "./utils/config/handle-log";
import { checkDatabasesHealth } from "./shared/database/init";
import { startGuardBot } from "./shared/bot";
import { initURLS } from "./shared/constants/urls";
import { initChats } from "./shared/constants/chats";
import { initPermissions } from "./shared/constants/permissions";
import { appLogger } from "./utils/config/logger";
import { startMinio } from "./shared/minio/init";
import { initRedis } from "./shared/redis/init";
import { startNats } from "./shared/nats/init";
import { startJobs } from "./shared/cron/init";
import { connectToRcon } from "./shared/rcon/init";

async function entrypoint() {
  appLogger.log(`Starting entrypoint`);

  await Promise.all([
    initURLS(), initChats(), checkDatabasesHealth()
  ])

  appLogger.log(`Finished entrypoint`);
}

async function services() {
  appLogger.log(`Starting services`);

  appLogger.log(`Starting NATS...`);
  await startNats();

  appLogger.log(`Starting Minio...`);
  await startMinio();

  appLogger.log(`Starting Redis...`);
  await initRedis();

  appLogger.log(`Finished services`);
}

async function startServices() {
  await entrypoint();
  await services();

  startJobs();
  startGuardBot();
}

async function start() {
  await initPermissions();
  await startServices();

  const { startApp } = await import("./app");
  await startApp()
}

start()

process
  .on('uncaughtException', handleFatalError)
  .on('unhandledRejection', handleFatalError)