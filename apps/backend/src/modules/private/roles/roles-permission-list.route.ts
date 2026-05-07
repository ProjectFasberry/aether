import { validatePermission } from "#/lib/validators";
import { Permissions } from "#/shared/constants/permissions";
import { general } from "#/shared/database/general-db";
import Elysia from "elysia";
import * as z from "zod";
import type { RolesRolePermissionListPayload } from "./roles-list.route";

export const rolesRolePermissionList = new Elysia()
  .use(validatePermission(Permissions.get("ROLES.READ")))
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
    params: z.object({ 
      id: z.coerce.number() 
    })
  })