import { validatePermission } from "#/lib/validators";
import { permissions } from "#/shared/constants/permissions";
import { general } from "#/shared/database/general-db";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";
import Elysia, { type Static, t } from "elysia";

const rolePermissionSchema = t.Object({
	id: t.Number(),
	name: t.String(),
});

export const rolesRolePermissionListSchema = t.Object({
	role_id: t.Number(),
	permissions: t.Array(rolePermissionSchema),
});

export type RolePermission = Static<typeof rolePermissionSchema>;
export type RolesRolePermissionListPayload = Static<typeof rolesRolePermissionListSchema>;

const rolesListPayloadSchema = t.Array(
	t.Object({
		id: t.Number(),
		name: t.String(),
	}),
);

async function getRolesList(): Promise<Static<typeof rolesListPayloadSchema>> {
	const query = await general.selectFrom("roles").select(["id", "name"]).orderBy("id", "asc").execute();

	return query;
}

export const rolesList = new Elysia().use(validatePermission(permissions.get("ROLES.READ"))).get(
	"/list",
	async () => {
		const data = await getRolesList();
		return { data };
	},
	{
		response: {
			200: withData(rolesListPayloadSchema),
		},
		detail: {
			summary: buildRouteSummary("List roles"),
		},
	},
);
