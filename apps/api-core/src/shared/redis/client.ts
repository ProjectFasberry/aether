import Redis, { type RedisOptions } from "ioredis";
import { logger } from "#/shared/constants/logger";
import { env } from "../env";
import { invariant } from "#/utils";

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
  logger: logger.withTag("redis"),
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
		this.logger.log(`Connecting to ${config.host}:${config.port}...`);

		return new Promise<Redis>((resolve, reject) => {
			try {
				const client = new Redis(config);

				client.on("error", (e) => {
					this.logger.withTag(label).error(`Runtime Error:`, e);
				});

				client.on("connect", () => this.logger.withTag(label).info(`Connection established`));

				client.once("ready", () => {
					this.logger.withTag(label).success(`Is ready`);
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
				this.logger.withTag(label).log("Disconnected")
				instance.disconnect()
			}
		}
	}
}
