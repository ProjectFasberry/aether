import type { ConnectionOptions, NatsConnection } from "@nats-io/nats-core";
import { connect } from "@nats-io/transport-node";
import { invariant } from "@repo/shared/lib/utils";
import { natsLogger } from "../logger";
import { env } from "../env";
import { subs } from "./subs";

const config: ConnectionOptions = {
	servers: [`nats://${env.NATS_HOST}`],
	user: env.NATS_USER,
	pass: env.NATS_PASSWORD,
	reconnect: true,
	maxReconnectAttempts: -1,
	reconnectTimeWait: 2000,
};

let client: NatsConnection | null = null;

export const nats = {
	async _init(): Promise<void> {
		try {
			client = await connect(config);
			natsLogger.success(`Connected to ${config.servers}`);
		} catch (e) {
			natsLogger.error(e);
			process.exit(1);
		}
	},
	get(): NatsConnection {
		invariant(client, "NATS client is not initialized");
		return client;
	},
	async start(): Promise<void> {
		await this._init();

		try {
			const nc = this.get();

			for (const sub of subs) {
				sub.cb(nc);
				natsLogger.success(`${sub.cb.name} subscribed to ${sub.subject}`);
			}
		} catch (e) {
			natsLogger.log(e);
		}
	},
	async close(): Promise<void> {
		if (!client) return;

		try {
			await client.drain();
			natsLogger.log("NATS connection closed.");
		} catch (e) {
			natsLogger.error("Error closing NATS connection:", e);
			process.exit(1);
		}
	},
};
