import type { ConnectionOptions, NatsConnection } from "@nats-io/nats-core";
import { connect } from "@nats-io/transport-node";
import { invariant } from "@repo/shared/lib/utils";
import { logger } from "../logger";
import { getEnv } from "../env";
import { SUBSCRIBERS } from "./subs";
import { isError } from "@repo/shared/lib/helpers";

const config: ConnectionOptions = {
	servers: [`nats://${getEnv().NATS_HOST}`],
	user: getEnv().NATS_USER,
	pass: getEnv().NATS_PASSWORD,
	reconnect: true,
	maxReconnectAttempts: -1,
	reconnectTimeWait: 2000,
};

let client: NatsConnection | null = null;

export const natsService = {
	logger: logger.child({ name: "nats" }),
	async _init(): Promise<void> {
		try {
			this.logger.info(`Connecting to ${config.servers}`);
			client = await connect(config);
			this.logger.info(`Connected`);
		} catch (e) {
			this.logger.error("Connection error", isError(e) ? e.message : e);
			process.exit(1);
		}
	},
	getInstance(): NatsConnection {
		invariant(client, "Nats client is not initialized");
		return client;
	},
	async start(): Promise<void> {
		await this._init();

		try {
			const nc = this.getInstance();

			for (const sub of SUBSCRIBERS) {
				sub.cb(nc);
				this.logger.info(`Subscribed to ${sub.subject}`);
			}
		} catch (e) {
			this.logger.log("Subscribing error", isError(e) ? e.message : e);
		}
	},
	async close(): Promise<void> {
		if (!client) return;

		try {
			await client.drain();
			this.logger.info("Connection closed");
		} catch (e) {
			this.logger.error("Error closing connection", isError(e) ? e.message : e);
			process.exit(1);
		}
	},
};
