import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { wrapError } from "@repo/shared/lib/helpers";
import { adoptCurrentPack, publishResourcePack } from "#/modules/content/resourcepack.model";
import { createAdminActivityLog } from "../private.model";
import { resourcePackSchema } from "./resourcepack.model";

/**
 * Registers the pack that is already live at the canonical object (uploaded by
 * hand before the panel existed) and publishes it. Repairs a manifest hash that
 * drifted from the file; repeated calls are harmless because versions are keyed
 * by SHA-256.
 */
export const resourcePackAdopt = new Elysia()
	.use(validatePermission("resourcepack.publish"))
	.post(
		"/adopt",
		async ({ nickname, status }) => {
			try {
				const { pack } = await adoptCurrentPack(nickname);
				const published = await publishResourcePack(pack.id);

				if (!published) return status(404, wrapError("RESOURCE_PACK_NOT_FOUND"));

				return { data: published };
			} catch (error) {
				if (error instanceof Error && error.message.includes("missing")) {
					return status(409, wrapError(error.message));
				}

				throw status(500, wrapError("RESOURCE_PACK_ADOPT_FAILED"));
			}
		},
		{
			response: {
				200: withData(resourcePackSchema),
				404: withError(t.String()),
				409: withError(t.String()),
				500: withError(t.String()),
			},
			afterResponse: ({ nickname: initiator, permission }) => {
				if (initiator) {
					createAdminActivityLog({
						event: permission,
						initiator,
						metadata: { resourcePack: "adopt" },
					});
				}
			},
			detail: {
				summary: buildRouteSummary("Adopt and publish the pack already stored at the canonical path"),
			},
		},
	);
