import { createNewsSchema } from "@repo/shared/schemas/news";
import Elysia from "elysia";
import { validatePermission } from "#/lib/validators";
import { permissions } from "#/shared/constants/permissions";
import { createAdminActivityLog } from "../private.model";
import { withData } from "#/shared/schemas";
import { createNews, newsSingleExtendedSchema } from "./news.model";
import { buildRouteSummary } from "#/utils";

export const newsCreateRoute = new Elysia().use(validatePermission(permissions.get("NEWS.CREATE"))).post(
	"/create",
	async ({ body, nickname }) => {
		const data = await createNews(body, nickname);
		return { data };
	},
	{
		body: createNewsSchema,
		afterResponse: ({ nickname: initiator, permission }) => {
			createAdminActivityLog({ initiator, event: permission });
		},
		response: {
			200: withData(newsSingleExtendedSchema),
		},
		detail: {
			summary: buildRouteSummary("Create a news article"),
		},
	},
);
