import { validatePermission } from "#/lib/validators";
import { permissions } from "#/shared/constants/permissions";
import { withData } from "#/shared/schemas";
import Elysia, { t } from "elysia";
import { getPermissionsByRole, permissionsByRolePayloadSchema, permissionsSchema } from "./permissions.model";
import { buildRouteSummary } from "#/utils";

export const permissionsListByRole = new Elysia()
	.use(validatePermission(permissions.get("PERMISSIONS.READ"), { withExternal: true }))
	.get(
		"/list/:id",
		async ({ params: { id }, query }) => {
			const data = await getPermissionsByRole(id, query);
			return { data };
		},
		{
			query: permissionsSchema,
			params: t.Object({
				id: t.Number(),
			}),
			response: {
				200: withData(permissionsByRolePayloadSchema),
			},
			detail: {
				summary: buildRouteSummary("List permissions by role"),
			},
		},
	);
