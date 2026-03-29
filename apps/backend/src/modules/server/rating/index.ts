import Elysia from "elysia";
import z from "zod";
import { buildRatings, events, ratingSchema } from "./rating.model";

const bySchema = z.enum(["belkoin", "charism", "lands_chunks", "reputation", "playtime", "parkour"]);

const ratingBy = new Elysia().get(
	"/:by",
	async ({ params, query }) => {
		const by = params.by;
		const event = events[by];

		try {
			const data = await event(query);

			// set.headers["Cache-Control"] = "public, max-age=30"
			// set.headers["vary"] = "Origin";

			return { data };
		} catch (e) {
			console.error(e);
			return { data: { data: [], meta: {} } };
		}
	},
	{
		params: z.object({
			by: bySchema,
		}),
		query: ratingSchema,
	},
);

const list = buildRatings();

const ratingList = new Elysia().get("/list", async () => {
	return { data: list };
});

export const rating = new Elysia().group("/rating", (app) => app.use(ratingList).use(ratingBy));
