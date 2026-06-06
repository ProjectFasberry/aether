import Elysia from "elysia";
import { permissionsListByRole } from "./permissions-by-role.route";
import { permissionsListAll } from "./permissions-all.route";

export const permissions = new Elysia()
  .group("/permissions", app => app
    .use(permissionsListAll)
    .use(permissionsListByRole)
  )