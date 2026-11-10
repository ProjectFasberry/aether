import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { getServers, serverListQuerySchema, serverSchema } from "./server.model";

export const serverList = new Elysia()
	.use(validatePermission("servers.read"))
	.get(
		"/",
		async ({ query }) => {
			const data = await getServers(query);
			return { data };
		},
		{
			query: serverListQuerySchema,
			response: {
				200: withData(t.Array(serverSchema)),
			},
			detail: {
				summary: buildRouteSummary("List servers with their descriptions"),
			},
		},
	);
