import Elysia from "elysia";
import { minecraftItems } from "#/modules/server/favorite-item/minecraft-items.route";
import { rating } from "#/modules/server/rating";
import { status } from "#/modules/server/status";
import { events } from "#/modules/server/events";
import { lands } from "#/modules/server/lands";
import { playerGroup } from "./player";
import { tasks } from "./tasks";
import { validateBannedStatus } from "#/lib/middlewares/validators";
import { skinGroup } from "./skin";
import { referrals } from "./referals";

const publicServerGroup = new Elysia()
	.group("", (app) => app
		.use(rating)
		.use(lands)
		.use(status)
		.use(events)
		.use(minecraftItems)
		.use(tasks)
		.use(skinGroup)
		.use(referrals)
	);

const privatedServerGroup = new Elysia()
	.use(validateBannedStatus())
	.group("", (app) => app
		.use(playerGroup)
	);

export const serverGroup = new Elysia()
	.group("/server", (app) => app
		.use(publicServerGroup)
		.use(privatedServerGroup)
	);