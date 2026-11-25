import Elysia from "elysia";
import { serverList } from "./server-list.route";
import { serverCreate } from "./server-create.route";
import { serverSolo } from "./server-solo.route";
import { serverUpdate } from "./server-update.route";

export const servers = new Elysia()
	.group("/servers", (app) => app
		.use(serverList)
		.use(serverCreate)
		.use(serverSolo)
		.use(serverUpdate)
	);
