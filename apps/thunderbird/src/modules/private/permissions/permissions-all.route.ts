import { validatePermission } from "#/lib/validators";
import { permissionsService } from "#/shared/constants/permissions";
import { withData } from "#/shared/schemas";
import Elysia from "elysia";
import { getPermissions, permissionsPayloadSchema } from "./permissions.model";
import { buildRouteSummary } from "#/utils";

export const permissionsListAll = new Elysia()
  .use(validatePermission(permissionsService.get("PERMISSIONS.READ"), { withExternal: true }))
  .get("/list/all", async () => {
    const data = await getPermissions();
    return { data };
  }, {
    response: {
      200: withData(permissionsPayloadSchema),
    },
    detail: {
      summary: buildRouteSummary("List all permissions"),
    },
  });
