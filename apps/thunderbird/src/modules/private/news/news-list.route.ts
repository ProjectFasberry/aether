import { getNewsList, getNewsListSchema } from "#/modules/news/news.model";
import { buildRouteSummary } from "#/utils";
import Elysia from "elysia";

export const newsList = new Elysia().get(
	"/list",
	async ({ query }) => {
		const data = await getNewsList(query);
		return { data };
	},
	{
		query: getNewsListSchema,
		detail: {
			summary: buildRouteSummary("List news articles"),
		},
	},
);
