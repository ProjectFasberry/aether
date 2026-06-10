import type { NatsConnection, Subscription } from "@nats-io/nats-core";
import { SUBJECTS } from "./subjects";
import { subscribeGiveBalance } from "#/lib/subscribers/sub-give-balance";
import { subscribePlayerJoin } from "#/lib/subscribers/sub-player-join";
import { subscribePlayerStats } from "#/lib/subscribers/sub-player-stats";
import { subscribeRefferalCheck } from "#/lib/subscribers/sub-referal-check";
import { subscribeReferalReward } from "#/lib/subscribers/sub-referal-reward";
import { subscribeConfig } from "#/lib/subscribers/sub-config";

type Sub = {
	name: string;
	cb: (nc: NatsConnection) => Subscription;
};

export const SUBSCRIBERS: Sub[] = [
	{
		name: 'Referral check',
		cb: (nc) => subscribeRefferalCheck(nc, SUBJECTS.USERS.REWARD_CHECK),
	},
	{
		name: "Player join",
		cb: (nc) => subscribePlayerJoin(nc, SUBJECTS.SERVER.EVENTS.USER.EVENT),
	},
	{
		name: "Referral reward",
		cb: (nc) => subscribeReferalReward(nc, SUBJECTS.USERS.REWARD),
	},
	{
		name: "Give balance",
		cb: (nc) => subscribeGiveBalance(nc, SUBJECTS.SERVER.EVENTS.USER.GIVE_BALANCE),
	},
	{
		name: "Player stats",
		cb: (nc) => subscribePlayerStats(nc, "todo" + ".*"),
	},
  {
    name: "subscribeConfig",
    cb: (nc) => subscribeConfig(nc, `${SUBJECTS.CONFIG.BASE}.>`)
  }
]
