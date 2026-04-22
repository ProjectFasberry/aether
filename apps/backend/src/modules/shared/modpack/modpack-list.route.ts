import Elysia, { t } from "elysia";
import { general } from "#/shared/database/general-db";
import { withData } from "#/shared/schemas";
import { processModpack } from "./modpack.model";

async function getModpacks() {
  const query = await general
    .selectFrom("modpacks")
    .selectAll()
    .execute()

  const data = query.map((modpack) => processModpack({ ...modpack, downloadLink: "unknown" }))

  return data
}

const modpackPayload = t.Object({
  mods: t.Array(t.String()),
  shaders: t.Array(t.String()),
  imageUrl: t.String(),
  client: t.String(),
  created_at: t.Union([t.Date(), t.String()]),
  id: t.Number(),
  name: t.String(),
  version: t.String(),
  downloadLink: t.String()
})

export const modpackList = new Elysia()
  .get('/list', async ({ set }) => {
    const data = await getModpacks()

    set.headers["Cache-Control"] = "public, max-age=60, s-maxage=60"
    set.headers["vary"] = "Origin";

    return { data }
  }, {
    response: {
      200: withData(
        t.Array(modpackPayload)
      )
    }
  })