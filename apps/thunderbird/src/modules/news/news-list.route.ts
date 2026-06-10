import Elysia, { type Static } from "elysia";
import { ipPlugin } from "#/lib/plugins/index";
import { withData } from "#/shared/schemas";
import { createNewsViews, getNewsList, newsPayloadSchema, getNewsListSchema } from "./news.model";
import { buildRouteSummary } from "#/utils";

export const newsList = new Elysia()
  .use(ipPlugin())
  .get("/list", async ({ query }) => {
    const data = await getNewsList(query);
    return { data };
  }, {
    query: getNewsListSchema,
    response: {
      200: withData(newsPayloadSchema),
    },
    afterResponse: ({ responseValue, ip }) => {
      if (!responseValue) return;

      const responseData = responseValue as { data: Static<typeof newsPayloadSchema> } | undefined;
      if (!responseData) return;

      const { data } = responseData.data;

      createNewsViews({
        ids: data.map((target) => target.id),
        ip,
      });
    },
    detail: {
      summary: buildRouteSummary("Get news list"),
    },
  });
