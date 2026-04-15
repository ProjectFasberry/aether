import Elysia from "elysia";
import { login } from "./login.route";
import { invalidate } from "./invalidate.route";
import { register } from "./register.route";
import { validate } from "./validate.route";
import { restore } from "./restore.route";
import { defineUser } from "#/lib/middlewares/define";

type SessionPayload = {
	id: string;
	browser: string;
	geo: { city: string; country: string };
	createdAt: string;
};

const sessions = new Elysia().use(defineUser()).group("/session", (app) =>
	app
		.get("/list", async ({ nickname, ...ctx }) => {
			const data: { data: SessionPayload[]; meta: PaginatedMeta } = {
				data: [],
				meta: { hasNextPage: false, hasPrevPage: false, endCursor: undefined, startCursor: undefined },
			};

			return {
				data,
			};
		})
		.get("/current", async ({ nickname, ...ctx }) => {
			const data: SessionPayload = {
				id: "test",
				createdAt: new Date().toISOString(),
				browser: "Google Chrome",
				geo: { city: "Volgograd", country: "Russia" },
			};

			return {
				data,
			};
		})
		.delete("/all", async (ctx) => {})
		.delete("/:id", async (ctx) => {}),
);

export const auth = new Elysia().group("/auth", (app) =>
	app.use(login).use(invalidate).use(register).use(validate).use(restore).use(sessions),
);
