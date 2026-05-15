import { validatePermission } from "#/lib/validators"
import { Permissions } from "#/shared/constants/permissions"
import Elysia, { type Static, t } from "elysia"
import { createAdminActivityLog } from "../private.model"

async function createModpack({ }: Static<typeof modpackCreateSchema>) {

}

const modpackCreateSchema = t.Object({
  title: t.String()
})

export const modpackCreate = new Elysia()
  .use(validatePermission(Permissions.get("MODPACKS.CREATE")))
  .post('/create', async ({ status, body }) => {
    const data = await createModpack(body)
    return { data }
  }, {
    body: modpackCreateSchema,
    afterResponse: ({ nickname: initiator, permission }) => {
      createAdminActivityLog({ initiator, event: permission })
    }
  })