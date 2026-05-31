import Elysia, { t } from "elysia";
import { general } from "#/shared/database/general-db";
import { sql } from "kysely";
import { withData } from "#/shared/schemas";

export const fact = new Elysia()
  .get('/random-fact', async () => {
    const data = await general
      .selectFrom('facts')
      .select('fact')
      .where(
        'id',
        '=',
        sql<number>`(SELECT FLOOR(random() * (SELECT COUNT(*) FROM facts)) + 1)`
      )
      .executeTakeFirst();

    if (!data) return { data: null }

    return { data: data.fact }
  }, {
    response: {
      200: withData(t.Nullable(t.String()))
    }
  })
