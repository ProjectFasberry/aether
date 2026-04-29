import "./assign.ts";

import { redis } from "./shared/redis/client";
import { checkDatabasesHealth } from "./shared/init-db";
import { chats } from "./shared/bot/chats";
import { bot } from "./shared/bot";
import { rcon } from "./shared/rcon/client";
import { urls } from "./shared/bot/urls";
import { handleFatalError } from "./shared/utils/handle-log";

async function start() {
	await checkDatabasesHealth();

	await chats.init();
	await urls.init();
	await redis.init();
	await rcon.connect();

	await bot.start();

	const { startApp } = await import("./app");
	startApp();
}

start();

process.on("uncaughtException", handleFatalError).on("unhandledRejection", handleFatalError);
