import Elysia, { t } from "elysia";
import { general } from "#/shared/database/general-db";
import { withData } from "#/shared/schemas";
import { modpackPayloadSchema } from "./modpack.model";

async function getModpacks() {
  const query = await general
    .selectFrom("modpacks")
    .selectAll()
    .execute()

  return query.map((modpack) => ({
    ...modpack,
    created_at: modpack.created_at.toString()
  }))
}

export const modpackList = new Elysia()
  .get('/list', async ({ set }) => {
    const data = await getModpacks()
    return { data }
  }, {
    response: {
      200: withData(
        t.Array(modpackPayloadSchema)
      )
    }
  })
