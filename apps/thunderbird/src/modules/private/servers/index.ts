import Elysia from "elysia";
import { serverList } from "./server-list.route";
import { serverSolo } from "./server-solo.route";
import { serverUpdate } from "./server-update.route";

export const servers = new Elysia()
	.group("/servers", (app) => app
		.use(serverList)
		.use(serverSolo)
		.use(serverUpdate)
	);
