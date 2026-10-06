import { logger } from "@repo/shared/utils/logger";
import type { ConnectionOptions, NatsConnection } from "@nats-io/nats-core";
import { connect } from "@nats-io/transport-node";
import { SUBSCRIBERS } from "./subscribers";
import { NATS_CONSUMERS, NATS_CONSUMERS_CB, NATS_JS_STREAMS } from "./cons";
import { jetstream, jetstreamManager } from "@nats-io/jetstream";
import { invariant } from "#/utils";
import { getEnv } from "#/shared/env"
import { isError } from "@repo/shared/lib/helpers";

const config: ConnectionOptions = {
  servers: [
    `nats://${getEnv().NATS_HOST}`
  ],
  user: getEnv().NATS_USER,
  pass: getEnv().NATS_PASSWORD,
  reconnect: true,
  maxReconnectAttempts: -1,
  reconnectTimeWait: 2000,
}

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
      process.exit(1)
    }
  },
  getInstance(): NatsConnection {
    invariant(client, "Nats client is not initialized");
    return client;
  },
  async close(): Promise<void> {
    if (!client) return;

    try {
      await client.drain();
      this.logger.info("Connection closed");
    } catch (e) {
      this.logger.error('Error closing connection', e);
      process.exit(1)
    }
  },
  async start({
    onStart
  }: {
    onStart?: () => void
    } = {}) {
    onStart?.();

    await this._init();

    const nc = this.getInstance();

    try {
      for (const sub of SUBSCRIBERS) {
        sub.cb(nc);
        this.logger.info(`Subscribed to "${sub.name}"`)
      }
    } catch (e) {
      this.logger.error(`Error subscribing`, e);
    }

    const js = jetstream(nc);
    const jsm = await jetstreamManager(nc);

    for (const { name, subjects } of NATS_JS_STREAMS) {
      try {
        await jsm.streams.add({ name, subjects });
        this.logger.info(`Stream "${name}" with ${subjects.map((d) => d).join(",")} added`);
      } catch (e) {
        this.logger.info(`Stream "${name}" with ${subjects.map((d) => d).join(",")} exists`);
      }
    }

    for (const { name, stream_name } of Object.entries(NATS_CONSUMERS).flatMap(([_, arr]) => arr)) {
      try {
        const consumer = await js.consumers.get(stream_name, name);
        this.logger.info(`Consumer "${name}"`);
      } catch (e) {
        const consumerInfo = await jsm.consumers.add(stream_name, { name });
        this.logger.info(`Consumer "${name}" added`);
      }
    }

    for (const { name, cb } of NATS_CONSUMERS_CB) {
      try {
        cb();
        this.logger.info(`Consumer "${name}" started`);
      } catch (e) {
        this.logger.error(`Error starting consumer "${name}"`, e);
      }
    }
  }
}
