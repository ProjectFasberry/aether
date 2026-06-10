import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { permissions } from "#/shared/constants/permissions";
import { createAdminActivityLog } from "../private.model";
import { withData, withError } from "#/shared/schemas";
import { updateOptions, updateOptionsSchema } from "./options.model";
import { buildRouteSummary, wrapError } from "#/utils";
import { isError } from "@repo/shared/lib/helpers";

export const optionsUpdate = new Elysia()
	.use(validatePermission(permissions.get("OPTIONS.UPDATE"), { withExternal: true }))
	.post(
		"/:name/edit",
		async ({ status, params: { name }, body }) => {
			try {
				const data = await updateOptions(name, body);
				return { data };
			} catch (e) {
				if (isError(e)) {
					if (e.message === "OPTION_NOT_FOUND") {
						throw status(404, wrapError("OPTION_NOT_FOUND"));
					}
				}
				throw e;
			}
		},
		{
			body: updateOptionsSchema,
			afterResponse: ({ nickname: initiator, permission }) => {
				if (initiator) createAdminActivityLog({ initiator, event: permission });
			},
			response: {
				200: withData(updateOptionsSchema),
				404: withError(t.UnionEnum(["OPTION_NOT_FOUND"])),
			},
			detail: {
				summary: buildRouteSummary("Update an option"),
			},
		},
	);
