import { general } from "#/shared/database/general-db";
import { credit } from "#/modules/economy/wallet.model";
import { enqueueGrantJob, registerGrantHandler } from "#/modules/economy/grant-jobs.model";
import { logErrorMsg } from "#/utils/config/log-utils";
import { validateReferal } from "#/utils/server/validate-referal";
import { logger } from "@repo/shared/utils/logger";
import type { DB } from "@gen/db/general";
import type { Kysely } from "kysely";
import type { Msg, NatsConnection } from "@nats-io/nats-core";

/**
 * Referral rewards are charisma only: BELKOIN is a purchased currency and must
 * not have a faucet. One pair is paid once, keyed by the ledger order id.
 *
 * Payouts are delayed by `referrals.payout_after` (set at registration) so an
 * instant alt account cannot be cashed out; `grant_jobs` runs the delayed
 * payment and survives a restart. IP/device signals are not captured yet (web
 * registration only), the columns exist so the anti-fraud check can be added
 * without another migration.
 */
const REWARD = {
	initiator: 60,
	recipient: 30,
	bonus: 50,
} as const;

const KIND = {
	reward: "referral.reward",
	bonus: "referral.bonus",
} as const;

const REASON = {
	initiator: "referral:initiator",
	recipient: "referral:recipient",
	bonus: "referral:bonus",
} as const;

type ReferralPair = { referrer: string; referral: string };

/** `0006` adds the payout columns; the generated schema is refreshed later. */
const db = general;

function referralKey({ referrer, referral }: ReferralPair): string {
	return `referral:${referrer}:${referral}`;
}

async function getReferral({ referrer, referral }: ReferralPair) {
	return db
		.selectFrom("referrals")
		.select(["payout_after", "rewarded_at"])
		.where("referrer", "=", referrer)
		.where("referral", "=", referral)
		.executeTakeFirst();
}

async function markCompleted({ referrer, referral }: ReferralPair): Promise<void> {
	await general
		.updateTable("referrals")
		.set({ completed: true })
		.where("referrer", "=", referrer)
		.where("referral", "=", referral)
		.where("completed", "=", false)
		.execute();
}

export async function grantReferralRewards({ referrer, referral }: ReferralPair): Promise<void> {
	const orderId = referralKey({ referrer, referral });

	await credit(referrer, "CHARISM", REWARD.initiator, {
		reason: REASON.initiator,
		orderId,
		actor: "system",
		metadata: { referral },
	});

	await credit(referral, "CHARISM", REWARD.recipient, {
		reason: REASON.recipient,
		orderId,
		actor: "system",
		metadata: { referrer },
	});

	await db
		.updateTable("referrals")
		.set({ rewarded_at: new Date(), completed: true })
		.where("referrer", "=", referrer)
		.where("referral", "=", referral)
		.execute();
}

export async function grantReferralBonus({ referrer, referral }: ReferralPair): Promise<void> {
	await credit(referral, "CHARISM", REWARD.bonus, {
		reason: REASON.bonus,
		orderId: referralKey({ referrer, referral }),
		actor: "system",
		metadata: { referrer },
	});
}

function payoutAfter(created: Date | null | undefined): Date | undefined {
	if (!created) return undefined;

	return created.getTime() > Date.now() ? created : undefined;
}

async function handleReferralCheck(msg: Msg) {
	const nickname = msg.string();
	if (!nickname) return;

	try {
		const validated = await validateReferal(nickname);
		if (!validated) return;

		const pair = { referrer: validated.initiator, referral: validated.recipient };

		const row = await getReferral(pair);
		if (!row) return;

		if (row.rewarded_at) {
			await markCompleted(pair);
			return;
		}

		const runAfter = payoutAfter(row.payout_after);

		if (runAfter) {
			await enqueueGrantJob({ orderId: referralKey(pair), kind: KIND.reward, payload: pair, runAfter });
		} else {
			await grantReferralRewards(pair);
		}

		await markCompleted(pair);
	} catch (e) {
		logErrorMsg(e, { subject: "referral-check" });
	}
}

async function handleReferralReward(msg: Msg) {
	let pair: ReferralPair;

	try {
		pair = msg.json<ReferralPair>();
	} catch (e) {
		logErrorMsg(e, { subject: "referral-reward" });
		return;
	}

	if (!pair?.referrer || !pair.referral) return;

	try {
		const row = await getReferral(pair);
		if (!row) return;

		// The bonus waits for the same payout window as the base reward.
		const runAfter = row.rewarded_at ? undefined : payoutAfter(row.payout_after);

		if (runAfter) {
			await enqueueGrantJob({ orderId: referralKey(pair), kind: KIND.bonus, payload: pair, runAfter });
			return;
		}

		await grantReferralBonus(pair);
	} catch (e) {
		logErrorMsg(e, { subject: "referral-reward" });
	}
}

registerGrantHandler(KIND.reward, async (payload) => {
	await grantReferralRewards(payload as ReferralPair);
});

registerGrantHandler(KIND.bonus, async (payload) => {
	await grantReferralBonus(payload as ReferralPair);
});

export const subscribeReferralCheck = (nc: NatsConnection, subject: string) => {
	const subscription = nc.subscribe(subject, {
		callback: (e, msg) => {
			if (e) return logErrorMsg(e);

			void handleReferralCheck(msg);
		},
	});

	logger.debug("Referral check subscription started");

	return subscription;
};

export const subscribeReferralReward = (nc: NatsConnection, subject: string) => {
	const subscription = nc.subscribe(subject, {
		callback: (e, msg) => {
			if (e) return logErrorMsg(e);

			void handleReferralReward(msg);
		},
	});

	return subscription;
};
