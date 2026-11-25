import Elysia from "elysia";
import { serverList } from "./server-list.route";
import { serverCreate } from "./server-create.route";
import { serverClientVersions } from "./server-client-versions.route";
import { serverSolo } from "./server-solo.route";
import { serverUpdate } from "./server-update.route";

export const servers = new Elysia()
	.group("/servers", (app) => app
		.use(serverList)
		.use(serverClientVersions)
		.use(serverCreate)
		.use(serverSolo)
		.use(serverUpdate)
	);
