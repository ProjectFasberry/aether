import { general } from "#/shared/database/general-db"
import { withData } from "#/shared/schemas";
import Elysia, { t } from "elysia"

export const appDictionaries = new Elysia()
  .get("/dictionaries", async () => {
    const query = await general
      .selectFrom("dictionaries")
      .select(["key", "value"])
      .execute()

    if (!query.length) return { data: null } 

    const data = query.reduce<Record<string, string>>((acc, cur) => {
      acc[cur.key] = cur.value;
      return acc;
    }, {});

    return { data }
  }, {
    response: {
      200: withData(
        t.Nullable(t.Record(t.String(), t.String()))
      )
    }
  })