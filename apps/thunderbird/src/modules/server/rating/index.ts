import Elysia, { t } from "elysia";
import { buildRatings, bySchema, getRating, ratingPayload, ratingSchema } from "./rating.model";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";

const ratingBy = new Elysia()
	.get("/:by", async ({ params: { by }, query }) => {
		const data = await getRating(by, query)
		return { data }
	}, {
		params: t.Object({
			by: bySchema,
		}),
		query: ratingSchema,
		response: {
			200: withData(ratingPayload)
		},
		detail: {
			summary: buildRouteSummary("Get rating by")
		}
	});

const list = buildRatings();

const ratingList = new Elysia()
	.get("/list", async () => {
		return { data: list };
  }, {
    detail: {
      summary: buildRouteSummary("Get rating list")
    }
	});

export const rating = new Elysia()
	.group("/rating", (app) => app
		.use(ratingList)
		.use(ratingBy)
	);
