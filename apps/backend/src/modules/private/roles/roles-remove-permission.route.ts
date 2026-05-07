import { validatePermission } from "#/lib/validators"
import { Permissions } from "#/shared/constants/permissions"
import { general } from "#/shared/database/general-db"
import Elysia from "elysia"
import * as z from "zod"
import { createAdminActivityLog } from "../private.model"

async function removePermissionForRole(
  roleId: number,
  { permissions }: z.infer<typeof rolesRemovePermissionForRoleSchema>
) {
  const query = await general
    .deleteFrom("role_permissions")
    .where("permission_id", "in", permissions)
    .where("role_id", "=", roleId)
    .executeTakeFirstOrThrow()

  const result = query.numDeletedRows

  return Number(result);
}

const rolesRemovePermissionForRoleSchema = z.object({
  permissions: z.array(z.coerce.number()).min(1)
})

export const rolesRemovePermissionForRole = new Elysia()
  .use(validatePermission(Permissions.get("ROLES.UPDATE")))
  .delete("/:id/permission/remove", async ({ params: { id }, body }) => {
    const data = await removePermissionForRole(id, body)
    return { data }
  }, {
    body: rolesRemovePermissionForRoleSchema,
    params: z.object({ id: z.coerce.number() }),
    afterResponse: ({ nickname: initiator, permission }) => {
      createAdminActivityLog({ initiator, event: permission })
    }
  })