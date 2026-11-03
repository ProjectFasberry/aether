import { redisService } from "#/shared/redis/client";

/**
 * Fixed-window counters in Redis, the same shape Yggdrasil uses.
 *
 * `bucket` names the purpose (`login:ip`, `login:nick`, ...), `subject` is the
 * thing being limited. Returns `false` when the caller is over the limit.
 */
export async function allowRequest(
	bucket: string,
	subject: string,
	limit: number,
	windowSeconds: number,
): Promise<boolean> {
	const redis = redisService.getInstance();
	const key = `rl:${bucket}:${subject}`;
	const hits = await redis.incr(key);

	// A lost TTL only widens the window, it never leaves a counter forever.
	if (hits === 1) await redis.expire(key, windowSeconds);

	return hits <= limit;
}

/** Limits for one endpoint, per IP and per account. */
export const LIMITS = {
	/** Launcher login: no CAPTCHA, so the window must be tight. */
	clientLoginIp: { limit: 10, window: 60 },
	clientLoginNickname: { limit: 5, window: 60 },
	/** Web login has a CAPTCHA on top; this only stops brute CPU load. */
	webLoginIp: { limit: 15, window: 60 },
} as const;
