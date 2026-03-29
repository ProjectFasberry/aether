import "../imports";
import "../declare.d.ts";

import { handleFatalError } from "./utils/config/handle-log";
import { checkDatabasesHealth } from "./shared/database/init";
import { initURLS } from "./shared/constants/urls";
import { initChats } from "./shared/constants/chats";
import { initPermissions } from "./shared/constants/permissions";
import { startMinio } from "./shared/minio/init";
import { initRedis } from "./shared/redis/init";
import { startNats } from "./shared/nats/init";
import { startJobs } from "./shared/cron/init";
import { connectToRcon } from "./shared/rcon/init";
import { isProduction } from "./shared/env";

async function entrypoint() {
	await initURLS();
	await initChats();
	await initPermissions();
	await checkDatabasesHealth();
}

async function services() {
	await startNats();
	await startMinio();
	await initRedis();
}

async function startServices() {
	await entrypoint();
	await services();

	startJobs();

	if (isProduction) {
		const { startGuardBot } = await import("./shared/bot");
		startGuardBot();
	}
}

async function start() {
	await startServices();

	const { startApp } = await import("./app");
	startApp();
}

start();

process.on("uncaughtException", handleFatalError).on("unhandledRejection", handleFatalError);
