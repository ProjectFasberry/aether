import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";
import Elysia from "elysia";
import { catalogSchema, getCatalog } from "./catalog.model";

export const catalog = new Elysia().get(
	"/catalog",
	async () => {
		const data = await getCatalog();
		return { data };
	},
	{
		response: {
			200: withData(catalogSchema),
		},
		detail: {
			summary: buildRouteSummary("Get server runtime catalog"),
		},
	},
);
