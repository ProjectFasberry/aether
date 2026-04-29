import Redis, { type RedisOptions } from "ioredis";
import { env } from "../env";
import { redisLogger } from "../logger";
import { invariant } from "@repo/shared/lib/utils";

let redisInstance: Redis | null = null;

const config: RedisOptions = {
	host: env.REDIS_HOST,
	port: Number(env.REDIS_PORT),
	password: env.REDIS_PASSWORD,
	username: env.REDIS_USER,
	maxRetriesPerRequest: 3,
};

export const redis = {
	get(): Redis {
		invariant(redisInstance, "Redis client is not initialized. Call initRedis() first.");
		return redisInstance;
	},
	async init() {
		if (redisInstance) return redisInstance;

		redisLogger.log(`Connecting to ${config.host}:${config.port}...`);

		return new Promise<Redis>((resolve, _) => {
			try {
				const client = new Redis(config);

				client.on("error", (e) => redisLogger.error("Redis Runtime Error:", e));
				client.on("connect", () => redisLogger.info("Redis connection established"));
				client.on("ready", () => {
					redisLogger.success("Redis is ready to receive commands");
					redisInstance = client;
					resolve(client);
				});
				client.on("end", () => redisLogger.warn("Redis connection closed"));
			} catch (e) {
				redisLogger.error("Failed to create Redis instance:", e);
				process.exit(1);
			}
		});
	},
};
