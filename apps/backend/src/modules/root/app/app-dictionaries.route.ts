import { general } from "#/shared/database/general-db"
import Elysia from "elysia"

export const appDictionaries = new Elysia()
  .get("/dictionaries", async ({ status }) => {
    const query = await general
      .selectFrom("dictionaries")
      .select(["key", "value"])
      .execute()

    const data = query.reduce<Record<string, string>>((acc, cur) => {
      acc[cur.key] = cur.value;
      return acc;
    }, {});

    return { data }
  })