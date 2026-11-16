import Elysia from "elysia";
import { validatePermission } from "#/lib/validators";
import { createAdminActivityLog } from "../private.model";
import { withData } from "#/shared/schemas";
import { createTaskSchema, tasksAdmin, taskPanelSchema } from "./tasks.model";
import { buildRouteSummary } from "#/lib/routes";

export const tasksPanelCreate = new Elysia()
	.use(validatePermission("tasks.create"))
	.post("/create", async ({ body }) => {
		return { data: await tasksAdmin.create(body) };
	}, {
		body: createTaskSchema,
		afterResponse: ({ nickname: initiator, permission }) => {
			createAdminActivityLog({ initiator, event: permission });
		},
		response: {
			200: withData(taskPanelSchema),
		},
		detail: {
			summary: buildRouteSummary("Create a task"),
		},
	});
