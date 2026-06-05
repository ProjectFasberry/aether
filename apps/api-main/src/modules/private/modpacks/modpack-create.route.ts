import { validatePermission } from "#/lib/validators"
import { Permissions } from "#/shared/constants/permissions"
import Elysia, { type Static, t } from "elysia"
import { createAdminActivityLog } from "../private.model"
import { general } from "#/shared/database/general-db"
import { withData, withError } from "#/shared/schemas"
import { wrapError } from "#/utils"

const modpackSchema = t.Object({
  id: t.Number(),
  name: t.String(),
  downloadLink: t.String(),
  created_at: t.String(),
})

const modpackCreateSchema = t.Pick(modpackSchema, ["name", "downloadLink"])

async function createModpack({
  name, downloadLink
}: Static<typeof modpackCreateSchema>): Promise<Static<typeof modpackSchema>> {
  const query = await general
    .insertInto("modpacks")
    .values({
      name,
      downloadLink
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return { ...query, created_at: query.created_at.toString() }
}

const MODRINTH_PREFIX = ['https://modrinth.com/modpack']

export const modpackCreate = new Elysia()
  .use(validatePermission(Permissions.get("MODPACKS.CREATE")))
  .post('/create', async ({ body, status }) => {
    if (!MODRINTH_PREFIX.some(prefix => body.downloadLink.startsWith(prefix))) {
      throw status(400, wrapError("INVALID_LINK"))
    }

    const data = await createModpack(body).catch(e => {
      throw status(500, wrapError(e))
    })

    return { data }
  }, {
    body: modpackCreateSchema,
    afterResponse: ({ nickname: initiator, permission }) => {
      createAdminActivityLog({ initiator, event: permission })
    },
    response: {
      200: withData(modpackSchema),
      400: withError(
        t.UnionEnum(["INVALID_LINK"])
      ),
      500: withError()
    }
  })
