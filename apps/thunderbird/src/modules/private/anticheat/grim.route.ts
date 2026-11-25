import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { grim } from "#/shared/database/grim-db";

const flagSchema = t.Object({
  id: t.Number(),
  uuid: t.String(),
  nickname: t.String(),
  check_name: t.String(),
  violations: t.Number(),
  setback_vl: t.Number(),
  server: t.String(),
  suppressed: t.Number(),
  created_at: t.Union([t.String(), t.Date()]),
});

export const grimFlags = new Elysia()
  .use(validatePermission("anticheat.read"))
  .get(
    "/flags",
    async ({ query }) => {
      let statement = grim
        .selectFrom("grim_flags")
        .selectAll()
        .orderBy("created_at", "desc")
        .limit(query.limit ?? 50);

      if (query.nickname) statement = statement.where("nickname", "ilike", `%${query.nickname}%`);
      if (query.check) statement = statement.where("check_name", "=", query.check);
      if (query.server) statement = statement.where("server", "=", query.server);
      if (query.before) {
        statement = statement.where("created_at", "<", new Date(query.before));
      }

      return { data: await statement.execute() };
    },
    {
      query: t.Object({
        nickname: t.Optional(t.String({ maxLength: 32 })),
        check: t.Optional(t.String({ maxLength: 64 })),
        server: t.Optional(t.String({ maxLength: 32 })),
        before: t.Optional(t.String({ maxLength: 40 })),
        limit: t.Optional(t.Integer({ minimum: 1, maximum: 200 })),
      }),
      response: { 200: withData(t.Array(flagSchema)) },
      detail: { summary: buildRouteSummary("List anticheat flags") },
    },
  )
  .get(
    "/summary",
    async ({ query }) => {
      const since = new Date(Date.now() - (query.hours ?? 24) * 3_600_000);

      const rows = await grim
        .selectFrom("grim_flags")
        .select(["check_name", "server"])
        .select(({ fn }) => [fn.countAll<number>().as("total")])
        .where("created_at", ">=", since)
        .groupBy(["check_name", "server"])
        .orderBy("total", "desc")
        .limit(100)
        .execute();

      return { data: rows };
    },
    {
      query: t.Object({ hours: t.Optional(t.Integer({ minimum: 1, maximum: 168 })) }),
      response: {
        200: withData(t.Array(t.Object({
          check_name: t.String(),
          server: t.String(),
          total: t.Union([t.Number(), t.String()]),
        }))),
      },
      detail: { summary: buildRouteSummary("Anticheat flags grouped by check") },
    },
  );
