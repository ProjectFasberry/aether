import { validatePermission } from "#/lib/validators"
import { Permissions } from "#/shared/constants/permissions"
import Elysia, { type Static, t } from "elysia"
import { createAdminActivityLog } from "../private.model"
import { general } from "#/shared/database/general-db"
import { withData } from "#/shared/schemas"

const modpackSchema = t.Object({
  id: t.Number(),
  name: t.String(),
  client: t.String(),
  imageUrl: t.String(),
  version: t.String(),
  created_at: t.String(),
  mods: t.String(),
  shaders: t.Nullable(t.String())
})

const modpackCreateSchema = t.Composite([
  t.Pick(modpackSchema, ["name", "client", "imageUrl", "version"]),
  t.Object({
    mods: t.Array(t.String()),
    shaders: t.Nullable(t.Array(t.String()), { default: null })
  })
])

async function createModpack({
  name, client, mods, imageUrl, version, shaders
}: Static<typeof modpackCreateSchema>): Promise<Static<typeof modpackSchema>> {
  const query = await general
    .insertInto("modpacks")
    .values({
      name,
      client,
      imageUrl,
      mods: mods.join(", "),
      version,
      shaders: shaders ? shaders.join(", ") : null
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return {
    ...query,
    created_at: query.created_at.toString()
  }
}

export const modpackCreate = new Elysia()
  .use(validatePermission(Permissions.get("MODPACKS.CREATE")))
  .post('/create', async ({ status, body }) => {
    const data = await createModpack(body)
    return { data }
  }, {
    body: modpackCreateSchema,
    afterResponse: ({ nickname: initiator, permission }) => {
      createAdminActivityLog({ initiator, event: permission })
    },
    response: {
      200: withData(
        modpackSchema
      )
    }
  })
