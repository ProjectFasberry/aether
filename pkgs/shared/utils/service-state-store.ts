import type { LoggingStateController } from "./logging-state";

type RedisReader = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<unknown>;
  publish: (channel: string, message: string) => Promise<unknown>;
};

type RedisBridge = {
  subscribe: (channel: string) => Promise<unknown>;
  on: (event: "message", listener: (channel: string, message: string) => void) => unknown;
};

type Logger = {
  info: (message: string) => void;
  warn: (message: string) => void;
};

export type ServiceStateStoreOptions<K extends string> = {
  state: LoggingStateController<K>;
  key: string;
  channel: string;
  /** Read-only fallback for the pre-namespace key. */
  legacyKey?: string;
  redis: RedisReader;
  bridge: RedisBridge;
  logger: Logger;
};

export type ServiceStateStore = {
  init: () => Promise<void>;
  persist: () => Promise<void>;
};

/**
 * Redis persistence + cross-replica pub/sub for app logging switches.
 * The shared layer only needs three commands, so it does not depend on ioredis.
 */
export function createServiceStateStore<K extends string>({
  state,
  key,
  channel,
  legacyKey,
  redis,
  bridge,
  logger,
}: ServiceStateStoreOptions<K>): ServiceStateStore {
  let initialized = false;

  const parse = (raw: string | null) => {
    if (!raw) return null;

    try {
      return JSON.parse(raw) as ReturnType<LoggingStateController<K>["getState"]>;
    } catch {
      logger.warn("stored state is not valid json, ignoring");
      return null;
    }
  };

  return {
    async init() {
      if (initialized) return;
      initialized = true;

      const stored = parse(await redis.get(key)) ?? (legacyKey ? parse(await redis.get(legacyKey)) : null);

      if (stored) {
        state.apply(stored);
        logger.info("state loaded from redis");
      }

      await bridge.subscribe(channel);
      bridge.on("message", (incoming, message) => {
        if (incoming !== channel) return;

        const next = parse(message);
        if (next) state.apply(next);
      });
    },

    async persist() {
      const payload = JSON.stringify(state.getState());

      await redis.set(key, payload);
      await redis.publish(channel, payload);
      logger.info("state persisted");
    },
  };
}
