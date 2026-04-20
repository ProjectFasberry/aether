import Redis from "ioredis";
import { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_USER } from "./env";
import { appLogger, logger } from "./logger";
import { invariant } from "@repo/shared/lib/utils";
const redisLogger = logger.withTag("Redis");
let redis = null;
const config = {
	host: REDIS_HOST,
	port: Number(REDIS_PORT),
	password: REDIS_PASSWORD,
	username: REDIS_USER,
	maxRetriesPerRequest: 3,
};
export function getRedis() {
	invariant(redis, "Redis client is not initialized. Call initRedis() first.");
	return redis;
}
export async function initRedis() {
	if (redis) return redis;
	appLogger.log(`Connecting to Redis at ${config.host}:${config.port}...`);
	return new Promise((resolve, _) => {
		try {
			const client = new Redis(config);
			client.on("error", (e) => redisLogger.error("Redis Runtime Error:", e));
			client.on("connect", () => redisLogger.info("Redis connection established"));
			client.on("ready", () => {
				redisLogger.success("Redis is ready to receive commands");
				redis = client;
				resolve(client);
			});
			client.on("end", () => redisLogger.warn("Redis connection closed"));
		} catch (e) {
			redisLogger.error("Failed to create Redis instance:", e);
			process.exit(1);
		}
	});
}
