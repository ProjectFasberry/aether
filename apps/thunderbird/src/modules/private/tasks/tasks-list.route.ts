import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { withData } from "#/shared/schemas";
import { tasksAdmin, taskPanelSchema } from "./tasks.model";
import { buildRouteSummary } from "#/lib/routes";

export const tasksPanelList = new Elysia()
	.use(validatePermission("tasks.read"))
	.get("/list", async () => {
		return { data: await tasksAdmin.list() };
	}, {
		response: {
			200: withData(t.Array(taskPanelSchema)),
		},
		detail: {
			summary: buildRouteSummary("List tasks for the panel"),
		},
	});
