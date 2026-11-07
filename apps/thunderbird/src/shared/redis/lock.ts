import { randomUUID } from "node:crypto";
import { redisService } from "./client";

const DEFAULT_RETRY_MS = 50;

/**
 * A short-lived Redis lock for work that must run once across API replicas.
 *
 * The lock is advisory: the TTL covers a crashed holder, and a failed
 * acquisition throws `LOCK_BUSY` instead of silently running the work twice.
 */
export async function withRedisLock<T>(
	key: string,
	ttlMs: number,
	fn: () => Promise<T>,
	{
		waitMs = 0,
		retryMs = DEFAULT_RETRY_MS,
	}: { waitMs?: number; retryMs?: number } = {},
): Promise<T> {
	const redis = redisService.getInstance();
	const lockKey = `lock:${key}`;
	const token = randomUUID();
	const deadline = Date.now() + waitMs;

	while (true) {
		const acquired = await redis.set(lockKey, token, "PX", ttlMs, "NX");
		if (acquired === "OK") break;

		if (Date.now() >= deadline) throw new Error("LOCK_BUSY");
		await new Promise((resolve) => setTimeout(resolve, retryMs));
	}

	try {
		return await fn();
	} finally {
		await redis.eval(
			"if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
			1,
			lockKey,
			token,
		).catch(() => undefined);
	}
}
