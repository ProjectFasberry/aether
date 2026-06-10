import { validatePermission } from "#/lib/validators";
import { permissions } from "#/shared/constants/permissions";
import Elysia from "elysia";
import { chat, chatDataSchema } from "./chat.model";
import { buildRouteSummary } from "#/utils";

export const chatData = new Elysia().use(validatePermission(permissions.get("PRIVATE.CHAT.READ"))).get(
	"/list",
	async ({ query: { asc, endCursor }, nickname }) => {
		const data = await chat.getHistory({ asc, endCursor, nickname });
		return { data };
	},
	{
		query: chatDataSchema,
		detail: {
			summary: buildRouteSummary("Get chat history"),
		},
	},
);
