import Elysia, { t } from "elysia";
import * as z from "zod";
import { general } from "#/shared/database/general-db";
import { withData } from "#/shared/schemas";
import { modpackPayload, processModpack } from "./modpack.model";

async function getModpack(id: number) {
  const query = await general
    .selectFrom("modpacks")
    .select([
      "id",
      "client",
      "created_at",
      "mods",
      "shaders",
      "version",
      "name",
      "imageUrl",
    ])
    .where("id", "=", id)
    .executeTakeFirst()

  if (!query) return null;

  const data = processModpack({ ...query, downloadLink: "unknown" })
  
  return data
}

export const modpackSingle = new Elysia()
  .get("/id", async ({ params }) => {
    const id = params.id;
    const data = await getModpack(id)
    return { data }
  }, {
    params: z.object({ id: z.coerce.number() }),
    response: {
      200: withData(
        t.Nullable(modpackPayload)
      )
    }
  })