import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { buildRouteSummary } from "#/lib/routes";
import { metaSchema, withData } from "#/shared/schemas";
import { eligiblePlayerSchema, getEligiblePlayers } from "./lands.model";

const eligibleQuery = t.Composite([
	t.Pick(metaSchema, ["limit"]),
	t.Object({
		searchQuery: t.Optional(t.String()),
	}),
]);

export const landsEligibleRoute = new Elysia()
	.use(validatePermission("lands.create"))
	.get("/eligible-players", async ({ query }) => {
		const data = await getEligiblePlayers({
			searchQuery: query.searchQuery,
			limit: query.limit,
		});

		return { data };
	}, {
		query: eligibleQuery,
		response: {
			200: withData(t.Array(eligiblePlayerSchema)),
		},
		detail: {
			summary: buildRouteSummary("List players without a land"),
		},
	});
