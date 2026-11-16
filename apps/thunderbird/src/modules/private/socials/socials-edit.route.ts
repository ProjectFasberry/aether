import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { createAdminActivityLog } from "../private.model";
import { setSocialAvailability, socialPayloadSchema } from "./socials.model";
import { isError } from "@repo/shared/utils";
import { wrapError } from "@repo/shared/lib/helpers";

export const socialsUpdate = new Elysia()
	.use(validatePermission("options.update", { withExternal: true }))
	.post("/:value/edit", async ({ status, params: { value }, body }) => {
		try {
			const data = await setSocialAvailability(value, body.isAvailable);
			return { data };
		} catch (e) {
			if (isError(e) && e.message === "SOCIAL_NOT_FOUND") {
				throw status(404, wrapError("SOCIAL_NOT_FOUND"));
			}

			throw e;
		}
	}, {
		body: t.Object({ isAvailable: t.Boolean() }),
		afterResponse: ({ nickname: initiator, permission }) => {
			if (initiator) {
				createAdminActivityLog({ initiator, event: permission });
			}
		},
		response: {
			200: withData(socialPayloadSchema),
			404: withError(t.UnionEnum(["SOCIAL_NOT_FOUND"])),
		},
		detail: {
			summary: buildRouteSummary("Toggle a linkable social"),
		},
	});
