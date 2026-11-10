import { serviceState } from "#/shared/state";
import { redisService } from "#/shared/redis/client";
import { LEGACY_SERVICE_STATE_KEY, SERVICE_STATE_CHANNEL, SERVICE_STATE_KEY } from "@repo/core/utils/redis";
import { createServiceStateStore } from "@repo/shared/utils";
import { logger } from "@repo/shared/utils/logger";

const stateLogger = logger.child({ name: "service-state" });

export const serviceStateStore = createServiceStateStore({
  state: serviceState,
  key: SERVICE_STATE_KEY,
  channel: SERVICE_STATE_CHANNEL,
  legacyKey: LEGACY_SERVICE_STATE_KEY,
  logger: stateLogger,
  redis: {
    get: (key) => redisService.getInstance().get(key),
    set: (key, value) => redisService.getInstance().set(key, value),
    publish: (channel, message) => redisService.getInstance().publish(channel, message),
  },
  bridge: {
    subscribe: (channel) => redisService.getBridgeInstance().subscribe(channel),
    on: (event, listener) => redisService.getBridgeInstance().on(event, listener),
  },
});

export const initServiceState = serviceStateStore.init;
export const persistServiceState = serviceStateStore.persist;
