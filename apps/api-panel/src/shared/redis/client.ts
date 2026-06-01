import Redis, { type RedisOptions } from "ioredis";
import { env } from "../env";
import { invariant } from "@repo/shared/lib/utils";
import { logger } from "../logger";

let instance: Redis | null = null;

const config: RedisOptions = {
  host: env.REDIS_HOST,
	// @ts-expect-error
	port: env.REDIS_PORT,
	password: env.REDIS_PASSWORD,
	username: env.REDIS_USER,
	maxRetriesPerRequest: 3,
};

export const redis = {
  logger: logger.withTag("redis"),
	getInstance(): Redis {
		invariant(instance, "Redis client is not initialized");
		return instance;
	},
	async init() {
		if (instance) return instance;

		this.logger.log(`Connecting to ${config.host}:${config.port}...`);

		return new Promise<Redis>((resolve, _) => {
			try {
				const client = new Redis(config);

				client.on("error", (e) => this.logger.error("Runtime Error:", e));
				client.on("connect", () => this.logger.info("Connection established"));
				client.on("ready", () => {
					this.logger.success("Is ready");
					instance = client;
					resolve(client);
				});
				client.on("end", () => this.logger.warn("Connection closed"));
			} catch (e) {
				this.logger.error("Failed to create instance", e);
				process.exit(1);
			}
		});
	},
};
