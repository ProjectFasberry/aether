import Elysia, { t } from "elysia";
import { withData, withError } from "#/shared/schemas";
import { getServerStatus, statusSchema, statusQuerySchema } from "./status.model";

export const status = new Elysia()
	.model({
		status: withData(t.Nullable(statusSchema)),
	})
	.get(
		"/status",
		async ({ query }) => {
			const data = await getServerStatus({ query });
			return { data };
		},
		{
			response: {
				200: "status",
				500: withError,
			},
			query: statusQuerySchema,
		},
	);
