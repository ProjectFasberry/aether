import type { NatsSubscription } from "#/shared/nats/client";
import { SUBJECTS } from "#/shared/nats/subjects";
import { subscribePlayerJoin } from "./subscribers/sub-player-join";
import { subscribeReferralCheck } from "./subscribers/sub-referals";
import { subscribePlaytime } from "./subscribers/sub-playtime";
import { subscribeTwoFactor } from "./subscribers/sub-two-factor";
import { subscribeConfig } from "./subscribers/sub-config";
import { subscribeSkinsChanged } from "./subscribers/sub-skins-changed";
import { subscribeGrimFlag } from "./subscribers/sub-grim-flag";

export const SUBSCRIBERS: NatsSubscription[] = [
	{
		name: 'Referral check',
		cb: (nc) => subscribeReferralCheck(nc, SUBJECTS.SERVER.PLAYER.REFERAL.CHECK),
	},
	{
		name: "Player join",
		cb: (nc) => subscribePlayerJoin(nc, SUBJECTS.SERVER.EVENTS.USER.EVENT),
	},
	{
		name: "Playtime",
		cb: (nc) => subscribePlaytime(nc, SUBJECTS.SERVER.PLAYER.PLAYTIME),
	},
	{
		name: "Two-factor",
		cb: (nc) => subscribeTwoFactor(nc, `${SUBJECTS.SERVER.PLAYER.TWO_FACTOR.BASE}.>`),
	},
	// "Player stats" is not wired: the request/reply responder lives on the
	// server side and no subject is agreed yet (sub-player-stats.ts stays).
  {
    name: "subscribeConfig",
    cb: (nc) => subscribeConfig(nc, `${SUBJECTS.CONFIG.BASE}.>`)
  },
  {
    name: "Skins changed",
    cb: (nc) => subscribeSkinsChanged(nc, SUBJECTS.EVENTS.SKINS.CHANGED),
  },
  {
    name: "Grim flags",
    cb: (nc) => subscribeGrimFlag(nc, SUBJECTS.GRIM.FLAG),
  }
]
