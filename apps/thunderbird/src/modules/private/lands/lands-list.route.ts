import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { buildRouteSummary } from "#/lib/routes";
import { metaSchema, searchQuerySchema, withData } from "#/shared/schemas";
import { adminLandListPayload, getAdminLands } from "./lands.model";

const listQuery = t.Composite([
	t.Pick(metaSchema, ["asc", "endCursor", "limit"]),
	t.Object({
		searchQuery: searchQuerySchema,
	}),
]);

export const landsListRoute = new Elysia()
	.use(validatePermission("lands.read"))
	.get("/list", async ({ query }) => {
		const data = await getAdminLands({
			asc: query.asc,
			limit: query.limit,
			endCursor: query.endCursor,
			searchQuery: query.searchQuery,
		});

		return { data };
	}, {
		query: listQuery,
		response: {
			200: withData(adminLandListPayload),
		},
		detail: {
			summary: buildRouteSummary("List lands for the admin panel"),
		},
	});
