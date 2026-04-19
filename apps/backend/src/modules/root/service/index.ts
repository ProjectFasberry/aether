import Elysia from "elysia";
import { bearer } from "@elysiajs/bearer";
import { general } from "#/shared/database/general-db";
import { cronTasks } from "#/shared/cron/init";

const serviceTasks = new Elysia().get("/cron", async () => {
	const data = [...cronTasks].map(([k, v]) => ({ name: k, ...v }));
	return { data };
});

export const service = new Elysia()
	.group("/service", (app) => app
		.use(bearer())
		.derive(async ({ bearer, status }) => {
			if (!bearer) {
				throw status(401);
			}

			const isExist = await general
				.selectFrom("api_keys")
				.select("key")
				.where("key", "=", bearer)
				.executeTakeFirst();

			if (!isExist?.key) {
				throw status(401);
			}

			return { bearer: isExist.key };
		})
		.use(serviceTasks),
	);