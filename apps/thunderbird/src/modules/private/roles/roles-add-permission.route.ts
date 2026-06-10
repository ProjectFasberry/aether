import { validatePermission } from "#/lib/validators";
import { permissions } from "#/shared/constants/permissions";
import { general } from "#/shared/database/general-db";
import Elysia, { type Static, t } from "elysia";
import { createAdminActivityLog } from "../private.model";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";

async function addPermissionForRole(roleId: number, { permissions }: Static<typeof rolesAddPermissionForRoleSchema>) {
	const values = permissions.map((p) => ({
		role_id: roleId,
		permission_id: p,
	}));

	const query = await general.insertInto("role_permissions").values(values).executeTakeFirstOrThrow();

	const result = query.numInsertedOrUpdatedRows;

	return Number(result);
}

const rolesAddPermissionForRoleSchema = t.Object({
	permissions: t.Array(t.Number(), { minItems: 1 }),
});

export const rolesAddPermissionForRole = new Elysia().use(validatePermission(permissions.get("ROLES.UPDATE"))).post(
	"/:id/permission/add",
	async ({ params: { id }, body }) => {
		const data = await addPermissionForRole(id, body);
		return { data };
	},
	{
		body: rolesAddPermissionForRoleSchema,
		params: t.Object({ id: t.Number() }),
		afterResponse: ({ nickname: initiator, permission }) => {
			createAdminActivityLog({ initiator, event: permission });
		},
		response: {
			200: withData(t.Number()),
		},
		detail: {
			summary: buildRouteSummary("Add permission to role"),
		},
	},
);
