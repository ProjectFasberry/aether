import { general } from "#/shared/database/general-db";
import { credit } from "#/modules/economy/wallet.model";
import { enqueueGrantJob, registerGrantHandler } from "#/modules/economy/grant-jobs.model";
import { logErrorMsg } from "#/shared/observability/log";
import { validateReferral } from "#/modules/referrals/validate";
import { logger } from "@repo/shared/utils/logger";
import type { Msg, NatsConnection } from "@nats-io/nats-core";

/**
 * Referral rewards are charisma only: BELKOIN is a purchased currency and must
 * not have a faucet. One pair is paid once, keyed by the ledger order id.
 *
 * Payouts are delayed by `referrals.payout_after` (set at registration) so an
 * instant alt account cannot be cashed out; `grant_jobs` runs the delayed
 * payment and survives a restart. The recipient bonus is paid in the same flow:
 * the old `users.referal.reward` subject had no publisher and the bonus never
 * reached anyone.
 */
const REWARD = {
	initiator: 60,
	recipient: 30,
	bonus: 50,
} as const;

const KIND = {
	reward: "referral.reward",
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

/** `completed` and `rewarded_at` are written together, after the money moved. */
async function markRewarded({ referrer, referral }: ReferralPair): Promise<void> {
	await general
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

	// Same order id, different reason: the ledger uniqueness is (order_id, reason).
	await grantReferralBonus({ referrer, referral });

	await markRewarded({ referrer, referral });
}

function payoutAfter(created: Date | null | undefined): Date | undefined {
	if (!created) return undefined;

	return created.getTime() > Date.now() ? created : undefined;
}

async function processPair(pair: ReferralPair): Promise<void> {
	const row = await getReferral(pair);
	if (!row || row.rewarded_at) return;

	const runAfter = payoutAfter(row.payout_after);

	if (runAfter) {
		await enqueueGrantJob({
			orderId: referralKey(pair),
			kind: KIND.reward,
			payload: pair,
			runAfter,
		});
		return;
	}

	await grantReferralRewards(pair);
}

async function handleReferralCheck(msg: Msg) {
	const nickname = msg.string();
	if (!nickname) return;

	try {
		const validated = await validateReferral(nickname);

		for (const validatedReferral of validated) {
			const pair = {
				referrer: validatedReferral.initiator,
				referral: validatedReferral.recipient,
			};

			try {
				await processPair(pair);
			} catch (e) {
				logErrorMsg(e, { subject: "referral-pair" });
			}
		}
	} catch (e) {
		logErrorMsg(e, { subject: "referral-check" });
	}
}

registerGrantHandler(KIND.reward, async (payload) => {
	await grantReferralRewards(payload as ReferralPair);
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
