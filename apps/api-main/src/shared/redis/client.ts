import Redis, { type RedisOptions } from "ioredis";
import { redisLogger } from "#/utils/config/logger";
import { env } from "../env";
import { invariant } from "#/helpers/invariant";

const instances: { main: Redis | null; bridge: Redis | null } = {
	main: null,
	bridge: null,
};

export const config: RedisOptions = {
	host: env.REDIS_HOST,
	port: env.REDIS_PORT,
	password: env.REDIS_PASSWORD,
	username: env.REDIS_USER,
	maxRetriesPerRequest: 3,
};

export const redis = {
	get(): Redis {
		invariant(instances.main, "Redis main client is not initialized.");
		return instances.main;
	},
	getBridge(): Redis {
		invariant(instances.bridge, "Redis bridge client is not initialized.");
		return instances.bridge;
	},
	async start() {
		await this._initMain()
		await this._initBridge()
	},
	async _initMain() {
		if (instances.main) return instances.main;
		instances.main = await this._createClient("main");
		return instances.main;
	},
	async _initBridge() {
		if (instances.bridge) return instances.bridge;
		instances.bridge = await this._createClient("bridge");
		return instances.bridge;
	},
	async _createClient(label: keyof typeof instances) {
		redisLogger.log(`Connecting to ${config.host}:${config.port}...`);

		return new Promise<Redis>((resolve, reject) => {
			try {
				const client = new Redis(config);

				client.on("error", (e) => {
					redisLogger.withTag(label).error(`Redis Runtime Error:`, e);
				});

				client.on("connect", () => redisLogger.withTag(label).info(`Connection established`));

				client.once("ready", () => {
					redisLogger.withTag(label).success(`Redis is ready`);
					resolve(client);
				});
				
				client.on("end", () => redisLogger.warn("Redis connection closed"));

				client.once("error", (e) => {
					reject(e);
				});
			} catch (e) {
				redisLogger.error("Failed to create Redis instance:", e);
				process.exit(1);
			}
		});
	},
	async close() {
		for (const [label, instance] of Object.entries(instances)) {
			if (instance) {
				redisLogger.withTag(label).log("Disconnected")
				instance.disconnect()
			}
		}
	}
}

export const getRedis = () => redis.get();