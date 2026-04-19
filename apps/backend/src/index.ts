import "../imports";
import "../declare.d.ts";

import { handleFatalError } from "./utils/config/handle-log";
import { checkDatabasesHealth } from "./shared/database/init";
import { initURLS } from "./shared/constants/urls";
import { initChats } from "./shared/constants/chats";
import { initPermissions } from "./shared/constants/permissions";
import { startMinio } from "./shared/minio/init";
import { config, initRedis } from "./shared/redis/init";
import { startNats } from "./shared/nats/init";
import { startJobs } from "./shared/cron/init";
import { connectToRcon } from "./shared/rcon/init";
import { isProduction } from "./shared/env";
import { getNats } from "./shared/nats/client";
import Redis from "ioredis";
import { loginQR } from "./modules/auth/login.model";

async function entrypoint() {
	await checkDatabasesHealth();
	await initURLS();
	await initChats();
	await initPermissions();
	await connectToRcon();
}

async function services() {
	await startNats();
	await startMinio();
	await initRedis();
}

async function startBridge() {
	const nc = getNats();
	const redisSub = new Redis(config)
	
	await redisSub.psubscribe('__keyevent@0__:expired');

	redisSub.on('pmessage', (pattern, channel, key) => {
		if (!key) return;
		
		if (!isProduction) {
			console.log(pattern, channel, key)
		}

		if (key.startsWith('auth:qr:')) {
			const qrToken = key.split(':')[2]

			const subject = loginQR.createAuthQRSubject("expired", qrToken)
			nc.publish(subject, JSON.stringify({ data: qrToken }));
		}
	});
}

async function startServices() {
	await entrypoint();
	await services();
	startBridge()
	
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
