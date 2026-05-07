import { validatePermission } from "#/lib/validators"
import { Permissions } from "#/shared/constants/permissions"
import Elysia from "elysia"
import * as z from "zod"
import { createAdminActivityLog } from "../private.model"

async function createModpack({ }: z.infer<typeof modpackCreateSchema>) {
  
}

const modpackCreateSchema = z.object({
  title: z.string()
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