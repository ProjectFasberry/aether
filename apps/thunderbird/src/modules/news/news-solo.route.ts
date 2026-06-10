import Elysia, { t } from "elysia";
import { getNewsSingle, newsSingleSchema } from "./news.model";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";

export const newsSingle = new Elysia().get(
	"/:id",
	async ({ params: { id } }) => {
		const data = await getNewsSingle(id);
		return { data };
	},
	{
		params: t.Object({
			id: t.Number(),
		}),
		response: {
			200: withData(newsSingleSchema),
		},
		detail: {
			summary: buildRouteSummary("Get news single"),
		},
	},
);
