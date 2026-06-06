import { validatePermission } from "#/lib/validators";
import { Permissions } from "#/shared/constants/permissions";
import { withData } from "#/shared/schemas";
import Elysia from "elysia";
import { getPermissions, permissionsPayloadSchema } from "./permissions.model";

export const permissionsListAll = new Elysia()
  .use(validatePermission(Permissions.get("PERMISSIONS.READ")))
  .get("/list/all", async () => {
    const data = await getPermissions();
    return { data }
  }, {
    response: {
      200: withData(
        permissionsPayloadSchema
      )
    }
  })
