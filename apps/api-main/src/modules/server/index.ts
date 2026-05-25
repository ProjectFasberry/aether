import Elysia from "elysia";
import { rating } from "#/modules/server/rating";
import { status } from "#/modules/server/status";
import { events } from "#/modules/server/events";
import { lands } from "#/modules/server/lands";
import { playerGroup } from "./player";
import { tasks } from "./tasks";
import { validateBannedStatus } from "#/lib/validators";
import { skinGroup } from "./skin";
import { referrals } from "./referals";

export const serverGroup = new Elysia()
	.group("/server", (app) => app
		.group("", (app) => app
			.use(rating)
			.use(lands)
			.use(status)
			.use(events)
			.use(tasks)
			.use(skinGroup)
			.use(referrals)
		)
		.group("", app => app
			.use(validateBannedStatus())
			.use(playerGroup)
		)
	);