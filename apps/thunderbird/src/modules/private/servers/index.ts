import Elysia from "elysia";
import { serverList } from "./server-list.route";
import { serverCreate } from "./server-create.route";
import { serverDelete } from "./server-delete.route";
import { serverClientVersions } from "./server-client-versions.route";
import { serverResourcePacks } from "./server-resource-packs.route";
import { serverSolo } from "./server-solo.route";
import { serverUpdate } from "./server-update.route";

export const servers = new Elysia()
	.group("/servers", (app) => app
		.use(serverList)
		.use(serverClientVersions)
		.use(serverResourcePacks)
		.use(serverCreate)
		.use(serverDelete)
		.use(serverSolo)
		.use(serverUpdate)
	);
