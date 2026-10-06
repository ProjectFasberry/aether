import Elysia, { t } from "elysia";
import { withData, withError } from "#/shared/schemas";
import { statusQuerySchema, statusSchema } from "@repo/core/modules/status/index"
import { redisService } from "#/shared/redis/client";
import { serverStatusService } from "./index.model";
import { buildRouteSummary } from "#/utils";

export const status = new Elysia()
	.get("/status", async ({ query }) => {
    const data = await serverStatusService.getData({ query, redis: redisService.getInstance });
		return { data };
	}, {
		response: {
			200: withData(t.Nullable(statusSchema)),
			500: withError(),
		},
    query: statusQuerySchema,
    detail: {
      summary: buildRouteSummary("Get server status")
    }
	});
