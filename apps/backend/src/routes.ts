import Elysia from "elysia";
import { store } from "./modules/store";
import { auth } from "./modules/auth";
import { serverGroup } from "./modules/server";
import { shared } from "./modules/shared";
import { privated } from "./modules/private";
import { rate } from "./modules/user/like.route";
import { me } from "#/modules/user/me.route";
import { service } from "./modules/root/service";
import { force } from "./modules/root";
import { appGroup } from "./modules/root/app";
import { validateGroup } from "./modules/root/validate";

export const main = new Elysia().use(shared).use(auth).use(me).use(serverGroup).use(store).use(privated).use(rate);

export const root = new Elysia()
	.get("/health", ({ status }) => status(200))
	.use(appGroup)
	.use(validateGroup)
	.use(service)
	.use(force);
