import { validatePermission } from "#/lib/validators"
import { Permissions } from "#/shared/constants/permissions"
import { general } from "#/shared/database/general-db"
import Elysia, { type Static, t } from "elysia"
import { createAdminActivityLog } from "../private.model"
import { withData } from "#/shared/schemas"

async function removePermissionForRole(
  roleId: number,
  { permissions }: Static<typeof rolesRemovePermissionForRoleSchema>
) {
  const query = await general
    .deleteFrom("role_permissions")
    .where("permission_id", "in", permissions)
    .where("role_id", "=", roleId)
    .executeTakeFirstOrThrow()

  const result = query.numDeletedRows

  return Number(result);
}

const rolesRemovePermissionForRoleSchema = t.Object({
  permissions: t.Array(t.Number(), { minItems: 1 })
})

export const rolesRemovePermissionForRole = new Elysia()
  .use(validatePermission(Permissions.get("ROLES.UPDATE")))
  .delete("/:id/permission/remove", async ({ params: { id }, body }) => {
    await removePermissionForRole(id, body)
    return { data: "OK" }
  }, {
    body: rolesRemovePermissionForRoleSchema,
    params: t.Object({
      id: t.Number()
    }),
    afterResponse: ({ nickname: initiator, permission }) => {
      createAdminActivityLog({ initiator, event: permission })
    },
    response: {
      200: withData(
        t.Literal("OK")
      )
    }
  })
