import Elysia, { t } from "elysia";
import { buildRatings, bySchema, getRating, ratingPayload, ratingSchema } from "./rating.model";
import { withData } from "#/shared/schemas";

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
		}
	});

const list = buildRatings();

const ratingList = new Elysia()
	.get("/list", async () => {
		return { data: list };
	});

export const rating = new Elysia()
	.group("/rating", (app) => app
		.use(ratingList)
		.use(ratingBy)
	);