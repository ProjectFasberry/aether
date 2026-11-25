import { general } from "#/shared/database/general-db";
import { validatePermission } from "#/lib/validators";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { wrapError } from "@repo/shared/lib/helpers";
import Elysia, { t } from "elysia";
import { getServer } from "./server.model";

/**
 * Removes the catalog row only: the server's content bundles and packs stay in
 * the bucket. `scripts/check-servers.ts` reports them as leftovers, which is
 * enough for a rare operation.
 */
export const serverDelete = new Elysia()
  .use(validatePermission("servers.update"))
  .delete(
    "/:id",
    async ({ params: { id }, status }) => {
      const existing = await getServer(id);
      if (!existing) return status(404, wrapError("SERVER_NOT_FOUND"));

      await general.transaction().execute(async (trx) => {
        await trx.deleteFrom("servers").where("id", "=", id).execute();

        // The catalog needs a default server to launch without a selection; a
        // deleted default promotes the oldest remaining row.
        if (existing.is_default) {
          const next = await trx.selectFrom("servers").select("id").orderBy("id").executeTakeFirst();
          if (next) {
            await trx.updateTable("servers").set({ is_default: true }).where("id", "=", next.id).execute();
          }
        }
      });

      return { data: "OK" as const };
    },
    {
      params: t.Object({ id: t.Number() }),
      response: {
        200: withData(t.Literal("OK")),
        404: withError(t.UnionEnum(["SERVER_NOT_FOUND"])),
      },
      detail: {
        summary: buildRouteSummary("Delete a server from the catalog"),
      },
    },
  );
