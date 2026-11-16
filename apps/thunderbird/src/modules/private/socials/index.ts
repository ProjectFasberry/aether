import Elysia from "elysia";
import { socialsList } from "./socials-list.route";
import { socialsUpdate } from "./socials-edit.route";

export const socials = new Elysia()
	.group("/socials", (app) => app
		.use(socialsList)
		.use(socialsUpdate)
	);
