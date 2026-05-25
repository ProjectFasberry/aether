import { validatePermission } from "#/lib/validators";
import { Permissions } from "#/shared/constants/permissions";
import { general } from "#/shared/database/general-db";
import { withData } from "#/shared/schemas";
import Elysia, { type Static, t } from "elysia";
import * as z from "zod";

const permissionsSchema = z.object({
  type: z.enum(["accessed", "restricted", "all"]).optional().default("all")
})

const permissionsByRolePayloadSchema =  t.Array(
  t.Object({
    permission_id: t.Number(),
    id: t.Number(),
    name: t.String(),
    role_id: t.Number()
  })
)

async function getPermissionsByRole(
  roleId: number,
  { type }: z.infer<typeof permissionsSchema>
): Promise<Static<typeof permissionsByRolePayloadSchema>> {
  let base = general
    .selectFrom("permissions")
    .innerJoin("role_permissions", "role_permissions.permission_id", "permissions.id")
    .select([
      "permissions.id",
      "permissions.name",
      "role_permissions.permission_id",
      "role_permissions.role_id",
    ])
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

export const permissionsListByRole = new Elysia()
  .use(validatePermission(Permissions.get("PERMISSIONS.READ")))
  .get("/list/:id", async ({ params: { id }, query }) => {
    const data = await getPermissionsByRole(id, query);
    return { data }
  }, {
    query: permissionsSchema,
    params: t.Object({
      id: t.Number()
    }),
    response: {
      200: withData(
        permissionsByRolePayloadSchema
      )
    }
  })
