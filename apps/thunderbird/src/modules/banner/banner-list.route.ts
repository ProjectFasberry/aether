import Elysia from "elysia";
import { withData, withError } from "#/shared/schemas";
import { bannersSchema, getBanners, getBannersListSchema } from "./banner.model";
import { buildRouteSummary } from "#/utils";

export const bannerList = new Elysia()
  .get("/list", async ({ query }) => {
    const data = await getBanners(query);
    return { data };
  }, {
    query: getBannersListSchema,
    response: {
      200: withData(bannersSchema),
      500: withError(),
    },
    detail: {
      summary: buildRouteSummary("Get banner list"),
    },
  });
