import Elysia from "elysia";
import { validatePermission } from "#/lib/validators";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { getCurrentResourcePack, listResourcePacks } from "#/modules/content/resourcepack.model";
import { resourcePackListSchema } from "./resourcepack.model";

export const resourcePackList = new Elysia()
	.use(validatePermission("resourcepack.read"))
	.get(
		"/",
		async () => {
			const [current, items] = await Promise.all([getCurrentResourcePack(), listResourcePacks()]);

			return { data: { current, items } };
		},
		{
			response: {
				200: withData(resourcePackListSchema),
			},
			detail: {
				summary: buildRouteSummary("List uploaded resource pack versions"),
			},
		},
	);
