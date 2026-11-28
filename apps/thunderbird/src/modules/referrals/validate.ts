import { general } from "#/shared/database/general-db";
import { logger } from "@repo/shared/utils/logger";
import { getNetworkPlaytime } from "./playtime";

// min playtime for reward //

// 3 hours
const MIN_PLAYTIME_FOR_RECIPIENT = 3 * 60 * 60 * 1000;
// 6 hours
const MIN_PLAYTIME_FOR_INITIATOR = 6 * 60 * 60 * 1000;

export type ValidatedReferral = { initiator: string; recipient: string };

/**
 * A player can be both a referrer and a referral, so every pending pair that
 * touches the nickname is checked. Pairs where the nickname is the recipient
 * come first: that is the role the lower threshold applies to, and the one a
 * join event can complete immediately.
 */
export async function validateReferral(nickname: string): Promise<ValidatedReferral[]> {
	const pairs = await general
		.selectFrom("referrals")
		.selectAll()
		.where((eb) =>
			eb.or([
				eb("referral", "=", nickname),
				eb("referrer", "=", nickname),
			])
		)
		.where("completed", "=", false)
		.execute();

	// Self-referrals are never paid: they used to be skipped only because the
	// CMI lookup needs two distinct rows.
	const joined = nickname.toLowerCase();
	const candidates = pairs
		.filter((pair) => pair.referrer.toLowerCase() !== pair.referral.toLowerCase())
		.sort((left, right) => {
			const leftIsRecipient = left.referral.toLowerCase() === joined ? 1 : 0;
			const rightIsRecipient = right.referral.toLowerCase() === joined ? 1 : 0;

			return rightIsRecipient - leftIsRecipient
				|| left.created_at.getTime() - right.created_at.getTime();
		});

	if (candidates.length === 0) return [];

	const playtime = await getNetworkPlaytime(
		candidates.flatMap((pair) => [pair.referrer, pair.referral]),
	);

	const validated = candidates.filter((pair) => {
		const initiator = playtime.get(pair.referrer.toLowerCase()) ?? 0;
		const recipient = playtime.get(pair.referral.toLowerCase()) ?? 0;

		return initiator > MIN_PLAYTIME_FOR_INITIATOR && recipient > MIN_PLAYTIME_FOR_RECIPIENT;
	});

	logger.debug(
		`referral pairs for ${nickname}: ${validated.length} of ${candidates.length} passed the playtime check`,
	);

	return validated.map((pair) => ({ initiator: pair.referrer, recipient: pair.referral }));
}
