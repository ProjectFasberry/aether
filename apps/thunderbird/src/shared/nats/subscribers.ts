import type { NatsConnection, Subscription } from "@nats-io/nats-core";
import { SUBJECTS } from "./subjects";
import { subscribeGiveBalance } from "#/lib/subscribers/sub-give-balance";
import { subscribePlayerJoin } from "#/lib/subscribers/sub-player-join";
import { subscribeReferralCheck } from "#/lib/subscribers/sub-referals";
import { subscribeReferralReward } from "#/lib/subscribers/sub-referals";
import { subscribeConfig } from "#/lib/subscribers/sub-config";

type Sub = {
	name: string;
	cb: (nc: NatsConnection) => Subscription;
};

export const SUBSCRIBERS: Sub[] = [
	{
		name: 'Referral check',
		cb: (nc) => subscribeReferralCheck(nc, SUBJECTS.USERS.REWARD_CHECK),
	},
	{
		name: "Player join",
		cb: (nc) => subscribePlayerJoin(nc, SUBJECTS.SERVER.EVENTS.USER.EVENT),
	},
	{
		name: "Referral reward",
		cb: (nc) => subscribeReferralReward(nc, SUBJECTS.USERS.REWARD),
	},
	{
		name: "Give balance",
		cb: (nc) => subscribeGiveBalance(nc, SUBJECTS.SERVER.EVENTS.USER.GIVE_BALANCE),
	},
	// "Player stats" is not wired: the request/reply responder lives on the
	// server side and no subject is agreed yet (sub-player-stats.ts stays).
  {
    name: "subscribeConfig",
    cb: (nc) => subscribeConfig(nc, `${SUBJECTS.CONFIG.BASE}.>`)
  }
]
