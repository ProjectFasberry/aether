import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { buildRouteSummary } from "#/lib/routes";
import { withData, withError } from "#/shared/schemas";
import { wrapError } from "@repo/shared/lib/helpers";
import { deleteAdminLand } from "./lands.model";

export const landsDeleteRoute = new Elysia()
	.use(validatePermission("lands.delete"))
	.delete("/:ulid", async ({ params: { ulid }, status }) => {
		const removed = await deleteAdminLand(ulid);

		if (!removed) return status(404, wrapError("LAND_NOT_FOUND"));

		return { data: "OK" as const };
	}, {
		params: t.Object({
			ulid: t.String({ minLength: 3, maxLength: 26 }),
		}),
		response: {
			200: withData(t.Literal("OK")),
			404: withError(t.UnionEnum(["LAND_NOT_FOUND"])),
		},
		detail: {
			summary: buildRouteSummary("Delete a land as an admin"),
		},
	});
