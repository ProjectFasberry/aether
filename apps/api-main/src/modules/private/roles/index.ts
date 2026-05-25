import Elysia from "elysia";
import { rolesList } from "./roles-list.route";
import { rolesAddPermissionForRole } from "./roles-add-permission.route";
import { rolesRolePermissionList } from "./roles-permission-list.route";
import { rolesRemovePermissionForRole } from "./roles-remove-permission.route";

export const roles = new Elysia()
  .group("/role", app => app
    .use(rolesAddPermissionForRole)
    .use(rolesRemovePermissionForRole)
    .use(rolesRolePermissionList)
    .use(rolesList)
  )