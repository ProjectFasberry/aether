/** Max accepted referrals per referrer in a rolling 12-month window. */
export const REFERRALS_PER_WINDOW = 5;

export type ReferralStats = { used: number; remaining: number; limit: number };

/**
 * Postgres returns `count(*)` as a bigint string, while the response schema
 * declares a number; `Number(...)` keeps the arithmetic and the encoder happy.
 */
export function toReferralStats(count: unknown, limit = REFERRALS_PER_WINDOW): ReferralStats {
	const used = Number(count ?? 0);
	return { used, remaining: Math.max(0, limit - used), limit };
}
