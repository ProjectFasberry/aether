import "./assign";

import { redis } from "./shared/redis/client";
import { checkDatabasesHealth } from "./shared/init-db";
import { chats } from "./shared/bot/chats";
import { bot } from "./shared/bot";
import { rcon } from "./shared/rcon/client";
import { urls } from "./shared/bot/urls";
import { handleProcessOnEvent } from "./shared/utils/handle-log";
import { nats } from "./shared/nats/client";

async function start() {
	await checkDatabasesHealth();

	await chats.init();
	await urls.init();
	await redis.init();
	await rcon.connect();
	await nats.start();

	await bot.start();

	const { startApp } = await import("./app");
	startApp();
}

start();

process
	.on("uncaughtException", (error) => handleProcessOnEvent("uncaughtException", { error }))
	.on("unhandledRejection", (error) => handleProcessOnEvent("unhandledRejection", { error }))
	.on("rejectionHandled", () =>
		handleProcessOnEvent("rejectionHandled", { kill: false, error: new Error("A promise rejection was handled late") }),
	)
	.on("warning", (error) => handleProcessOnEvent("warning", { error }));
// .on("SIGTERM", () => shutdown("SIGTERM"))
// .on("SIGINT", () => shutdown("SIGINT"))
