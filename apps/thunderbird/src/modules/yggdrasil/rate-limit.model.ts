import { redisService } from "#/shared/redis/client";
import { yggdrasilLogger } from "./logger.model";

/**
 * Fixed-window limits for the public Yggdrasil surface.
 *
 * `hasJoined` and `profile` are usually called by the proxy (one IP), the rest by
 * the launcher or the game client. The limits are per IP and deliberately loose:
 * they stop scripted abuse, not normal play.
 */
export const LIMITS = {
  metadata: { limit: 600, window: 60 },
  auth: { limit: 60, window: 60 },
  join: { limit: 60, window: 60 },
  hasJoined: { limit: 1200, window: 60 },
  profile: { limit: 600, window: 60 },
  bulk: { limit: 60, window: 60 },
} as const;

export type RateLimitBucket = keyof typeof LIMITS;

const key = (bucket: RateLimitBucket, ip: string) => `ygg:rl:${bucket}:${ip}`;

/** `false` means the caller is over the limit and must get a 429. */
export async function allowRequest(bucket: RateLimitBucket, ip: string): Promise<boolean> {
  const { limit, window } = LIMITS[bucket];
  const redis = redisService.getInstance();
  const counter = key(bucket, ip);

  const hits = await redis.incr(counter);

  // First hit in the window starts the countdown; a lost TTL only means a
  // slightly wider window, never an unexpiring counter.
  if (hits === 1) await redis.expire(counter, window);

  if (hits > limit) {
    yggdrasilLogger.warn(`rate limit: ${bucket} ip=${ip} hits=${hits}`);

    return false;
  }

  return true;
}

export const TOO_MANY_REQUESTS = {
  error: "TooManyRequests",
  errorMessage: "Rate limit exceeded.",
};
