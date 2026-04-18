import Redis, { type RedisOptions } from "ioredis";
import { appLogger, logger } from "#/utils/config/logger";
import { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_USER } from "../env";
import { invariant } from "#/helpers/invariant";

const redisLogger = logger.withTag("Redis");

let redis: Redis | null = null;

export const config: RedisOptions = {
	host: REDIS_HOST,
	port: REDIS_PORT,
	password: REDIS_PASSWORD,
	username: REDIS_USER,
};

export function getRedis(): Redis {
	invariant(redis, "Redis client is not initialized");
	return redis;
}

export async function initRedis() {
	appLogger.log(`Starting Redis...`);

	try {
		redis = new Redis(config);
		redisLogger.success(`Connected to ${config.host}:${config.port}`);
	} catch (e) {
		redisLogger.error(e);
		process.exit(1);
	}
}
