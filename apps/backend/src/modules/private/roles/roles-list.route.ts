import { validatePermission } from "#/lib/validators";
import { Permissions } from "#/shared/constants/permissions";
import { general } from "#/shared/database/general-db";
import Elysia from "elysia";

export type RolePayload = {
  id: number;
  name: string;
}

export type RolePermission = {
  id: number;
  name: string;
}

export type RolesRolePermissionListPayload = {
  role_id: number;
  permissions: RolePermission[];
}

export const rolesList = new Elysia()
  .use(validatePermission(Permissions.get("ROLES.READ")))
  .get("/list", async (ctx) => {
    const data: RolePayload[] = await general
      .selectFrom("roles")
      .select(["id", "name"])
      .orderBy("id", "asc")
      .execute();

    return { data }
  })