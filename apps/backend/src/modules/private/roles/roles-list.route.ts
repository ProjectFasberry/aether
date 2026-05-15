import { validatePermission } from "#/lib/validators";
import { Permissions } from "#/shared/constants/permissions";
import { general } from "#/shared/database/general-db";
import Elysia, { type Static, t } from "elysia";

const rolePermissionSchema = t.Object({
  id: t.Number(),
  name: t.String()
})

export const rolesRolePermissionListSchema = t.Object({
  role_id: t.Number(),
  permissions: t.Array(
    rolePermissionSchema
  )
})

export type RolePermission = Static<typeof rolePermissionSchema>;
export type RolesRolePermissionListPayload = Static<typeof rolesRolePermissionListSchema>

export const rolesList = new Elysia()
  .use(validatePermission(Permissions.get("ROLES.READ")))
  .get("/list", async (ctx) => {
    const data = await general
      .selectFrom("roles")
      .select(["id", "name"])
      .orderBy("id", "asc")
      .execute();

    return { data }
  })