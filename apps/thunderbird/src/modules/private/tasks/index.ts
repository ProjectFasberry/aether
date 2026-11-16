import Elysia from "elysia";
import { tasksPanelList } from "./tasks-list.route";
import { tasksPanelCreate } from "./tasks-create.route";
import { tasksPanelUpdate } from "./tasks-update.route";
import { tasksPanelDelete } from "./tasks-delete.route";

export const tasksPanel = new Elysia()
	.group("/tasks", (app) => app
		.use(tasksPanelList)
		.use(tasksPanelCreate)
		.use(tasksPanelUpdate)
		.use(tasksPanelDelete)
	);
