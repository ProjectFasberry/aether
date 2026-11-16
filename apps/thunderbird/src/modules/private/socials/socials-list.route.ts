import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { getSocials, socialPayloadSchema } from "./socials.model";

export const socialsList = new Elysia()
	.use(validatePermission("options.read", { withExternal: true }))
	.get("/list", async () => {
		const data = await getSocials();
		return { data };
	}, {
		response: {
			200: withData(t.Array(socialPayloadSchema)),
			500: withError(),
		},
		detail: {
			summary: buildRouteSummary("List linkable socials"),
		},
	});
