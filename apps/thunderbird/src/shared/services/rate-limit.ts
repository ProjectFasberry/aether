import { redisService } from "#/shared/redis/client";
import { logger } from "@repo/shared/utils/logger";

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

	if (hits > limit) logger.warn(`Rate limit hit: ${bucket} ${subject} (${hits}/${limit})`);

	return hits <= limit;
}

/** `AUTH_*_LIMIT` overrides let staging raise the limits for load tests. */
function envLimit(name: string, fallback: number): number {
	const value = Number(Bun.env[name]);

	return Number.isFinite(value) && value > 0 ? value : fallback;
}

/** Limits for one endpoint, per IP and per account. */
export const LIMITS = {
	/** Launcher login: no CAPTCHA, so the window must be tight. */
	clientLoginIp: { limit: envLimit("AUTH_LOGIN_IP_LIMIT", 10), window: 60 },
	clientLoginNickname: { limit: envLimit("AUTH_LOGIN_NICK_LIMIT", 5), window: 60 },
	/** Web login has a CAPTCHA on top; this only stops brute CPU load. */
	webLoginIp: { limit: envLimit("AUTH_WEB_LOGIN_IP_LIMIT", 15), window: 60 },
} as const;
