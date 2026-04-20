import Elysia from "elysia";
import * as z from "zod/v4";
import { buildRatings, events, ratingSchema } from "./rating.model";

const bySchema = z.enum(["belkoin", "charism", "lands_chunks", "reputation", "playtime", "parkour"]);

const ratingBy = new Elysia()
	.get("/:by", async ({ params: { by }, query }) => {
		const event = events[by];

		try {
			const data = await event(query);

			// set.headers["Cache-Control"] = "public, max-age=30"
			// set.headers["vary"] = "Origin";

			return { data };
		} catch (e) {
			return { data: { data: [], meta: {} } };
		}
	}, {
		params: z.object({
			by: bySchema,
		}),
		query: ratingSchema,
		// todo: add model for response
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