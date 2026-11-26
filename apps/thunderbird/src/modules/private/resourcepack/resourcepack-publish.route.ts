import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { wrapError } from "@repo/shared/lib/helpers";
import { getResourcePack, publishResourcePack } from "#/modules/content/resourcepack.model";
import { createAdminActivityLog } from "../private.model";
import { resourcePackSchema } from "./resourcepack.model";

export const resourcePackPublish = new Elysia()
	.use(validatePermission("resourcepack.publish"))
	.post(
		"/:id/current",
		async ({ params: { id }, status }) => {
			const row = await getResourcePack(id);
			if (!row) return status(404, wrapError("RESOURCE_PACK_NOT_FOUND"));

			try {
				const pack = await publishResourcePack(id);
				if (!pack) return status(404, wrapError("RESOURCE_PACK_NOT_FOUND"));

				return { data: pack };
			} catch (error) {
				if (error instanceof Error && error.message.includes("missing from the volume")) {
					return status(409, wrapError(error.message));
				}

				throw status(500, wrapError("RESOURCE_PACK_PUBLISH_FAILED"));
			}
		},
		{
			params: t.Object({ id: t.Number() }),
			response: {
				200: withData(resourcePackSchema),
				404: withError(t.String()),
				409: withError(t.String()),
				500: withError(t.String()),
			},
			afterResponse: ({ nickname: initiator, permission, params }) => {
				if (initiator) {
					createAdminActivityLog({
						event: permission,
						initiator,
						metadata: { resourcePack: params.id },
					});
				}
			},
			detail: {
				summary: buildRouteSummary("Publish a resource pack version or roll back to it"),
			},
		},
	);
