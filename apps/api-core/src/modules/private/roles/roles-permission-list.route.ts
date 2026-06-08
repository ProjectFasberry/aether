import { validatePermission } from "#/lib/validators";
import { permissions } from "#/shared/constants/permissions";
import { general } from "#/shared/database/general-db";
import Elysia, { t } from "elysia";
import { rolesRolePermissionListSchema, type RolesRolePermissionListPayload } from "./roles-list.route";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";

export const rolesRolePermissionList = new Elysia()
  .use(validatePermission(permissions.get("ROLES.READ")))
  .get("/:id/permission/list", async ({ params: { id } }) => {
    const query = await general
      .selectFrom("role_permissions")
      .innerJoin("permissions", "permissions.id", "role_permissions.permission_id")
      .select([
        "role_permissions.permission_id as permission_id",
        "permissions.name as permission_name"
      ])
      .where("role_permissions.role_id", "=", id)
      .execute();

    const data: RolesRolePermissionListPayload = {
      role_id: id,
      permissions: query.map(r => ({
        id: r.permission_id,
        name: r.permission_name
      }))
    };

    return { data }
  }, {
    params: t.Object({
      id: t.Number()
    }),
    response: {
      200: withData(
        rolesRolePermissionListSchema
      )
    },
    detail: {
      summary: buildRouteSummary("List role permissions")
    }
  })
