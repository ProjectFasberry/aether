import Elysia, { t } from "elysia";
import { withData, withError } from "#/shared/schemas";
import { statusQuerySchema, statusSchema } from "@repo/core/modules/status/index"
import { redis } from "#/shared/redis/client";
import { serverStatus } from "./index.model";

export const status = new Elysia()
	.get("/status", async ({ query }) => {
    const data = await serverStatus.getData({ query, redis: redis.getInstance });
		return { data };
	}, {
		response: {
			200: withData(t.Nullable(statusSchema)),
			500: withError(),
		},
		query: statusQuerySchema,
	});
