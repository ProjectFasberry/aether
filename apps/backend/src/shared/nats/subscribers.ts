import { subscribeGiveBalance } from "#/lib/subscribers/sub-give-balance";
import { subscribePlayerJoin } from "#/lib/subscribers/sub-player-join";
import { subscribePlayerStats } from "#/lib/subscribers/sub-player-stats";
import { subscribePostHook } from "#/lib/subscribers/sub-post-hook";
import { subscribeRefferalCheck } from "#/lib/subscribers/sub-referal-check";
import { subscribeReferalReward } from "#/lib/subscribers/sub-referal-reward";
import type { Subscription } from "@nats-io/nats-core";
import { SUBJECTS } from "./subjects";

type Subscriber = {
	name: string;
	subject: string;
	fn: (subject: string) => Subscription;
};

export const NATS_SUBCRIBERS = new Set<Subscriber>([
	{
		name: "subscribeRefferalCheck",
		fn: subscribeRefferalCheck,
		subject: SUBJECTS.USERS.REWARD_CHECK,
	},
	{
		name: "subscribePlayerJoin",
		fn: subscribePlayerJoin,
		subject: SUBJECTS.SERVER.EVENTS.USER.EVENT,
	},
	{
		name: "subscribeReferalReward",
		fn: subscribeReferalReward,
		subject: SUBJECTS.USERS.REWARD,
	},
	{
		name: "subscribeGiveBalance",
		fn: subscribeGiveBalance,
		subject: SUBJECTS.SERVER.EVENTS.USER.GIVE_BALANCE,
	},
	{
		name: "subscribePlayerStats",
		fn: subscribePlayerStats,
		subject: "todo" + ".*",
	},
	{
		name: "subscribePostHook",
		fn: subscribePostHook,
		subject: `${SUBJECTS.EVENTS.BASE}.>`,
	},
]);
