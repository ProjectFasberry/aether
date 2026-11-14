import Elysia from "elysia";
import { landsListRoute } from "./lands-list.route";
import { landsEligibleRoute } from "./lands-eligible.route";
import { landsCreateRoutes } from "./lands-create.route";
import { landsDeleteRoute } from "./lands-delete.route";

export const lands = new Elysia()
	.group("/lands", (app) => app
		.use(landsListRoute)
		.use(landsEligibleRoute)
		.use(landsCreateRoutes)
		.use(landsDeleteRoute)
	);
