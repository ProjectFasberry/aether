import Redis, { type RedisOptions } from "ioredis";
import { getEnv } from "../env";
import { invariant } from "#/utils";
import { logger } from "@repo/shared/utils/logger";

const instances: { main: Redis | null; bridge: Redis | null } = {
	main: null,
	bridge: null,
};

export const config: RedisOptions = {
	host: getEnv().REDIS_HOST,
	port: getEnv().REDIS_PORT,
	password: getEnv().REDIS_PASSWORD,
	username: getEnv().REDIS_USER,
	maxRetriesPerRequest: 3,
};

export const redisService = {
  logger: logger.child({ name: "redis" }),
	getInstance(): Redis {
		invariant(instances.main, "Redis main client is not initialized.");
		return instances.main;
	},
	getBridgeInstance(): Redis {
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
		this.logger.info(`Connecting to ${config.host}:${config.port}...`);

		return new Promise<Redis>((resolve, reject) => {
			try {
				const client = new Redis(config);

				client.on("error", (e) => {
					this.logger.child({ name: label }).error(`Runtime Error:`, e);
				});

				client.on("connect", () => this.logger.child({ name: label }).info(`Connection established`));

				client.once("ready", () => {
					this.logger.child({ name: label }).info(`Is ready`);
					resolve(client);
				});

				client.on("end", () => this.logger.warn("Connection closed"));

				client.once("error", (e) => {
					reject(e);
				});
			} catch (e) {
				this.logger.error("Failed to create instance", e);
				process.exit(1);
			}
		});
	},
	async close() {
		for (const [label, instance] of Object.entries(instances)) {
			if (instance) {
				this.logger.child({ name: label }).info("Disconnected")
				instance.disconnect()
			}
		}
	}
}
