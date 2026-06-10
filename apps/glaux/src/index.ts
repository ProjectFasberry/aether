import "./assign";

import { redis } from "./shared/redis/client";
import { chats } from "./shared/bot/chats";
import { bot } from "./shared/bot";
import { rcon } from "./shared/rcon/client";
import { urlsService } from "./shared/bot/urls";
import { handleProcessOnEvent } from "./shared/utils/handle-log";
import { nats } from "./shared/nats/client";
import { env } from "./shared/env";
import { minio } from "./shared/minio/client";
import { createBootstrap, type BootstrapStep } from "@repo/core/utils/boot";
import { isError } from "@repo/shared/lib/helpers";
import { appLogger, logger } from "./shared/logger";
import { checkDatabasesHealth, printDatabases } from "@repo/core/utils/database";
import { DATABASES_FOR_CHECK } from "./shared/database";

const pipeline: BootstrapStep[] = [
	{
		name: "db-health",
		run: () => {
			const logger = appLogger.withTag("db-health");

			return checkDatabasesHealth({
				databases: DATABASES_FOR_CHECK,
				onSuccess: (results) => {
					printDatabases(logger, results);
				},
				verbose: !env.PROD,
				onFailure: (e) => {
					logger.error(e);
					process.exit(1);
				},
			});
		},
	},
	{
		name: "chats",
		run: () => chats.init(),
	},
	{
		name: "urls",
		run: () =>
			urlsService.init({
				onFinish: (data) => {
					const dataStr = Array.from(data)
						.map(([name, ip]) => `${name}: ${ip}`)
						.join("\n");
					logger.box({ title: ` Urls `, message: dataStr });
				},
				onError: (e) => {
					logger.error("Urls error", e);
				},
			}),
	},
	{
		name: "redis",
		run: () => redis.init(),
	},
	{
		name: "rcon",
		run: () =>
			rcon.connect({
				onSuccess: () => {
					logger.success(`Connected`);
				},
				onError: (e) => {
					logger.error("RCON error", e);
				},
			}),
	},
	{
		name: "nats",
		run: () => nats.start(),
	},
	{
		name: "minio",
		run: () => minio.start({ showBuckets: false }),
	},
];

const boot = createBootstrap(pipeline);

try {
	await boot.start();

	await bot.start();

	const { startApp } = await import("./app");
	startApp();
} catch (e) {
	Promise.reject(isError(e) ? e : new Error("UNKNOWN"));
}

const shutdown = async (signal: string) => {
	appLogger.log(`Received ${signal}. Starting graceful shutdown...`);
	setTimeout(() => process.exit(1), 10000).unref();

	await Promise.allSettled([nats.close(), redis.close(), rcon.disconnect()]);

	appLogger.log("All connections closed. Bye!");
	process.exit(0);
};

process
	.on("uncaughtException", (error) => handleProcessOnEvent("uncaughtException", { error }))
	.on("unhandledRejection", (error) => handleProcessOnEvent("unhandledRejection", { error }))
	.on("rejectionHandled", (error) => handleProcessOnEvent("rejectionHandled", { kill: false, error }))
	.on("warning", (error) => handleProcessOnEvent("warning", { error }))
	.on("SIGTERM", () => shutdown("SIGTERM"))
	.on("SIGINT", () => shutdown("SIGINT"));
