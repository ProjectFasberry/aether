import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { createAdminActivityLog } from "../private.model";
import { withData } from "#/shared/schemas";
import { editTaskSchema, tasksAdmin, taskPanelSchema } from "./tasks.model";
import { buildRouteSummary } from "#/lib/routes";

export const tasksPanelUpdate = new Elysia()
	.use(validatePermission("tasks.update"))
	.post("/:id/edit", async ({ params: { id }, body }) => {
		return { data: await tasksAdmin.edit(id, body) };
	}, {
		params: t.Object({ id: t.Number() }),
		body: editTaskSchema,
		afterResponse: ({ nickname: initiator, permission }) => {
			createAdminActivityLog({ initiator, event: permission });
		},
		response: {
			200: withData(taskPanelSchema),
		},
		detail: {
			summary: buildRouteSummary("Update a task"),
		},
	});
