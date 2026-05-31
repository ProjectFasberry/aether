import "../imports";
import "../declare.d.ts";
import "./assign";

import { handleProcessOnEvent } from "./utils/config/handle-log";
import { checkDatabasesHealth } from "./shared/database/init";
import { urls } from "./shared/constants/urls";
import { permissions } from "./shared/constants/permissions";
import { minio } from "./shared/minio/client";
import { redis } from "./shared/redis/client";
import { rcon } from "./shared/rcon/client";
import { psubscribe } from "./shared/redis/subscribers";
import { nats } from "./shared/nats/client";
import { appLogger } from "./utils/config/logger";
import { startJobs } from "./shared/cron/init";

type BootstrapStep = {
	name: string;
	run: () => Promise<void> | void;
}

const bootstrapPipeline: BootstrapStep[] = [
	{ name: "db-health", run: () => checkDatabasesHealth() },
	{ name: "urls", run: () => urls.init() },
	{ name: "permissions", run: () => permissions.init() },
	{ name: "rcon", run: () => rcon.connect() },
	{ name: "nats", run: () => nats.start() },
	{ name: "minio", run: () => minio.start() },
	{ name: "redis", run: () => redis.start() },
	{ name: "psubscribe", run: () => psubscribe() },
	{ name: "jobs", run: () => startJobs() }
];

async function bootstrap() {
	const start = Date.now();

	for (const step of bootstrapPipeline) {
		appLogger.withTag("Bootstrap").log(`Executing: ${step.name}`);
		await step.run();
	}

	appLogger.success(`Bootstrap finished in ${Date.now() - start}ms`);
}

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

await bootstrap();

const { startApp } = await import("./app");
startApp();

process
	.on("uncaughtException", (error) => handleProcessOnEvent("uncaughtException", { error }))
	.on("unhandledRejection", (error) => handleProcessOnEvent("unhandledRejection", { error }))
	.on("rejectionHandled", () => handleProcessOnEvent("rejectionHandled", { kill: false, error: new Error("A promise rejection was handled late") }))
	.on("warning", (error) => handleProcessOnEvent("warning", { error }))
	.on("SIGTERM", () => shutdown("SIGTERM"))
	.on("SIGINT", () => shutdown("SIGINT"))
