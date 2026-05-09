import { appLogger, natsLogger } from "#/utils/config/logger";
import type { ConnectionOptions, NatsConnection } from "@nats-io/nats-core";
import { connect } from "@nats-io/transport-node";
import { NATS_HOST, NATS_PASSWORD, NATS_USER } from "#/shared/env"
import { invariant } from "#/helpers/invariant";
import { subs } from "./subscribers";
import { NATS_CONSUMERS, NATS_JS_STREAMS } from "./cons";
import { startOrderConsumer } from "#/utils/server/call-command";
import { jetstream, jetstreamManager } from "@nats-io/jetstream";

const config: ConnectionOptions = {
  servers: [
    `nats://${NATS_HOST}`
  ],
  user: NATS_USER,
  pass: NATS_PASSWORD,
  reconnect: true,
  maxReconnectAttempts: -1,
  reconnectTimeWait: 2000,
}

let client: NatsConnection | null = null;

export const nats = {
  async _init(): Promise<void> {
    try {
      client = await connect(config);
      natsLogger.success(`Connected to ${config.servers}`)
    } catch (e) {
      natsLogger.error(e)
      process.exit(1)
    }
  },
  get(): NatsConnection {
    invariant(client, 'NATS client is not initialized')
    return client;
  },
  async close(): Promise<void> {
    if (!client) return;

    try {
      await client.drain();
      natsLogger.log('NATS connection closed.')
    } catch (e) {
      natsLogger.error('Error closing NATS connection:', e)
      process.exit(1)
    }
  },
  async start() {
    appLogger.log(`Starting NATS...`);

    await this._init();

    const nc = this.get();

    try {
      for (const sub of subs) {
        sub.cb(nc);
        natsLogger.success(`${sub.name} subscribed`);
      }
    } catch (e) {
      natsLogger.log(e);
    }

    const js = jetstream(nc);
    const jsm = await jetstreamManager(nc);

    for (const { name, subjects } of NATS_JS_STREAMS) {
      try {
        await jsm.streams.add({ name, subjects });
        natsLogger.log(`Stream ${name} with ${subjects.map((d) => d).join(",")} added`);
      } catch (e) {
        natsLogger.log(`Stream ${name} with ${subjects.map((d) => d).join(",")} exists`);
      }
    }

    for (const { name, stream_name } of Object.entries(NATS_CONSUMERS).flatMap(([_, arr]) => arr)) {
      try {
        const ec = await js.consumers.get(stream_name, name);
        natsLogger.log(`Consumer ${name} exists `);
      } catch (e) {
        const c = await jsm.consumers.add(stream_name, { name });
        natsLogger.log(`Consumer ${name} added`);
      }
    }

    startOrderConsumer();
  }
}