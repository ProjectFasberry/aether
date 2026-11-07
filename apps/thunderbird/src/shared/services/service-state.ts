import { applyServiceState, getServiceState, type ServiceState } from "#/shared/constants";
import { redisService } from "#/shared/redis/client";
import { logger } from "@repo/shared/utils/logger";

/**
 * Service switches (logging flags) are process state, so they are persisted in
 * Redis and broadcast to every replica. Without this, a switch changed in one
 * instance had no effect on the others and was lost on restart.
 */
const STATE_KEY = "service:state";
const CHANNEL = "service:state:changed";

const stateLogger = logger.child({ name: "service-state" });

function parse(raw: string | null): Partial<ServiceState> | null {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as Partial<ServiceState>;
  } catch {
    stateLogger.warn("stored state is not valid json, ignoring");
    return null;
  }
}

export async function initServiceState(): Promise<void> {
  const redis = redisService.getInstance();

  const stored = parse(await redis.get(STATE_KEY));

  if (stored) {
    applyServiceState(stored);
    stateLogger.info("state loaded from redis");
  }

  const bridge = redisService.getBridgeInstance();
  await bridge.subscribe(CHANNEL);

  bridge.on("message", (channel, message) => {
    if (channel !== CHANNEL) return;

    const next = parse(message);
    if (next) applyServiceState(next);
  });
}

export async function persistServiceState(): Promise<void> {
  const redis = redisService.getInstance();
  const state = getServiceState();
  const payload = JSON.stringify(state);

  await redis.set(STATE_KEY, payload);
  await redis.publish(CHANNEL, payload);
}
