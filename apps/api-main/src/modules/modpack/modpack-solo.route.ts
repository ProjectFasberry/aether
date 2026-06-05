import Elysia, { t } from "elysia";
import { withData } from "#/shared/schemas";
import { getModpack, modpackPayloadSchema } from "./modpack.model";

export const modpackSingle = new Elysia()
  .get("/id", async ({ params }) => {
    const data = await getModpack(params.id)
    return { data }
  }, {
    params: t.Object({
      id: t.Number()
    }),
    response: {
      200: withData(
        t.Nullable(modpackPayloadSchema)
      )
    }
  })
