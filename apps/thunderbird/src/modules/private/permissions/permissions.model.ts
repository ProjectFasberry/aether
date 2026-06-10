import { general } from "#/shared/database/general-db";
import { type Static, t } from "elysia";
import * as z from "zod";

export const permissionsPayloadSchema = t.Array(
	t.Object({
		name: t.String(),
		id: t.Number(),
	}),
);

export async function getPermissions(): Promise<Static<typeof permissionsPayloadSchema>> {
	const query = await general.selectFrom("permissions").selectAll().execute();

	return query;
}

export const permissionsSchema = z.object({
	type: z.enum(["accessed", "restricted", "all"]).optional().default("all"),
});

export const permissionsByRolePayloadSchema = t.Array(
	t.Object({
		permission_id: t.Number(),
		id: t.Number(),
		name: t.String(),
		role_id: t.Number(),
	}),
);

export async function getPermissionsByRole(
	roleId: number,
	{ type }: z.infer<typeof permissionsSchema>,
): Promise<Static<typeof permissionsByRolePayloadSchema>> {
	let base = general
		.selectFrom("permissions")
		.innerJoin("role_permissions", "role_permissions.permission_id", "permissions.id")
		.select(["permissions.id", "permissions.name", "role_permissions.permission_id", "role_permissions.role_id"])
		.orderBy("permissions.id", "asc");

	switch (type) {
		case "accessed":
			base = base.where("role_permissions.role_id", "=", roleId);
			break;
		case "restricted":
			base = base.where("role_permissions.role_id", "!=", roleId);
			break;
		case "all":
		default:
			break;
	}

	return base.execute();
}
