import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { createAdminActivityLog } from "../private.model";
import { withData } from "#/shared/schemas";
import { tasksAdmin } from "./tasks.model";
import { buildRouteSummary } from "#/lib/routes";

export const tasksPanelDelete = new Elysia()
	.use(validatePermission("tasks.delete"))
	.delete("/:id", async ({ params: { id } }) => {
		await tasksAdmin.delete(id);
		return { data: "OK" as const };
	}, {
		params: t.Object({ id: t.Number() }),
		afterResponse: ({ nickname: initiator, permission }) => {
			createAdminActivityLog({ initiator, event: permission });
		},
		response: {
			200: withData(t.Literal("OK")),
		},
		detail: {
			summary: buildRouteSummary("Delete a task"),
		},
	});
