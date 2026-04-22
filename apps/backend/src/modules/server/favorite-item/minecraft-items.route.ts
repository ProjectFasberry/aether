import Elysia, { t } from "elysia";
import { sql } from "kysely";
import { getStaticUrl } from "#/helpers/volume";
import { general } from "#/shared/database/general-db";
import { withData } from "#/shared/schemas";

async function getMinecraftItems() {
  const query = await general
    .selectFrom("items")
    .select([
      "description",
      "title",
      "image",
      sql<number>`CAST(id AS INT)`.as("id"),
    ])
    .execute();

  const data = query.map((item) => ({
    ...item,
    image: getStaticUrl(item.image)
  }))

  return data
}

export const itemPayload = t.Object({
  image: t.String(),
  description: t.Nullable(t.String()),
  title: t.String(),
  id: t.Number(),
})

export const minecraftItems = new Elysia()
  .get("/minecraft-items", async (ctx) => {
    const data = await getMinecraftItems();
    return { data }
  }, {
    response: {
      200: withData(
        t.Array(itemPayload)
      )
    }
  })