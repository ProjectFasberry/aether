import { serviceState } from "../state";
import { redis } from "../redis/client";
import { LEGACY_SERVICE_STATE_KEY, SERVICE_STATE_CHANNEL, SERVICE_STATE_KEY } from "@repo/core/utils/redis";
import { createServiceStateStore } from "@repo/shared/utils";
import { logger } from "../logger";

export const serviceStateStore = createServiceStateStore({
  state: serviceState,
  key: SERVICE_STATE_KEY,
  channel: SERVICE_STATE_CHANNEL,
  legacyKey: LEGACY_SERVICE_STATE_KEY,
  logger: logger.child({ name: "service-state" }),
  redis: {
    get: (key) => redis.getInstance().get(key),
    set: (key, value) => redis.getInstance().set(key, value),
    publish: (channel, message) => redis.getInstance().publish(channel, message),
  },
  bridge: {
    subscribe: (channel) => redis.getBridgeInstance().subscribe(channel),
    on: (event, listener) => redis.getBridgeInstance().on(event, listener),
  },
});

export const initServiceState = serviceStateStore.init;
export const persistServiceState = serviceStateStore.persist;
