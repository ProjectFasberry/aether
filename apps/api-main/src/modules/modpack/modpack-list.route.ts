import Elysia, { t } from "elysia";
import { general } from "#/shared/database/general-db";
import { withData } from "#/shared/schemas";
import { modpackPayloadSchema, processModpack } from "./modpack.model";

async function getModpacks() {
  const query = await general
    .selectFrom("modpacks")
    .selectAll()
    .execute()

  return query.map((modpack) => processModpack({ ...modpack, downloadLink: "unknown" }))
}

export const modpackList = new Elysia()
  .get('/list', async ({ set }) => {
    const data = await getModpacks()

    set.headers["Cache-Control"] = "public, max-age=60, s-maxage=60"
    set.headers["vary"] = "Origin";

    return { data }
  }, {
    response: {
      200: withData(
        t.Array(modpackPayloadSchema)
      )
    }
  })
