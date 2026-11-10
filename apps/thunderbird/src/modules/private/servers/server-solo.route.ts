import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { wrapError } from "@repo/shared/lib/helpers";
import { getServer, serverSchema } from "./server.model";

export const serverSolo = new Elysia()
	.use(validatePermission("servers.read"))
	.get(
		"/:id",
		async ({ params: { id }, status }) => {
			const data = await getServer(id);

			if (!data) return status(404, wrapError("SERVER_NOT_FOUND"));

			return { data };
		},
		{
			params: t.Object({
				id: t.Number(),
			}),
			response: {
				200: withData(serverSchema),
				404: withError(t.String()),
			},
			detail: {
				summary: buildRouteSummary("Get a server with its description"),
			},
		},
	);
