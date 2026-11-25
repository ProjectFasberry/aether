import { general } from "#/shared/database/general-db";
import { validatePermission } from "#/lib/validators";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { wrapError } from "@repo/shared/lib/helpers";
import Elysia, { t } from "elysia";
import { validateServerContent } from "#/modules/content/manifest.model";
import { clientModSchema, getServer, loaderSchema, serverSchema } from "./server.model";

const serverUpdateBody = t.Object({
  fullname: t.Optional(t.String({ minLength: 1, maxLength: 64 })),
  description: t.Optional(t.Nullable(t.String({ maxLength: 1024 }))),
  thumbnail: t.Optional(t.String({ maxLength: 512 })),
  available: t.Optional(t.Boolean()),
  excluded: t.Optional(t.Boolean()),
  is_default: t.Optional(t.Boolean()),
  client_version: t.Optional(t.String({ minLength: 1, maxLength: 32 })),
  loader: t.Optional(loaderSchema),
  loader_version: t.Optional(t.Nullable(t.String({ maxLength: 64 }))),
  java_major: t.Optional(t.Integer({ minimum: 8, maximum: 99 })),
  resource_pack: t.Optional(t.Nullable(t.String({ maxLength: 255 }))),
  client_mod: t.Optional(clientModSchema),
});

export const serverUpdate = new Elysia()
  .use(validatePermission("servers.update"))
  .patch(
    "/:id",
    async ({ params: { id }, body, status }) => {
      const existing = await getServer(id);

      if (!existing) return status(404, wrapError("SERVER_NOT_FOUND"));

      if (Object.keys(body).length === 0) return { data: existing };

      // A runtime or pack that was never published would leave the launcher
      // with a server it cannot install and cannot launch.
      if (body.client_version !== undefined || body.resource_pack !== undefined) {
        const problem = await validateServerContent(
          body.client_version ?? existing.client_version,
          body.resource_pack !== undefined ? body.resource_pack : existing.resource_pack,
        );
        if (problem) return status(422, wrapError(problem));
      }

      // Exactly one default: the unique index rejects a second true row.
      if (body.is_default === true) {
        await general.transaction().execute(async (trx) => {
          await trx.updateTable("servers").set({ is_default: false }).where("is_default", "=", true).execute();
          await trx.updateTable("servers").set(body).where("id", "=", id).execute();
        });
      } else {
        await general.updateTable("servers").set(body).where("id", "=", id).execute();
      }

      return { data: await getServer(id) };
    },
    {
      params: t.Object({ id: t.Number() }),
      body: serverUpdateBody,
      response: {
        200: withData(serverSchema),
        404: withError(t.String()),
        422: withError(t.String()),
      },
      detail: {
        summary: buildRouteSummary("Update a server: availability, runtime and presentation"),
      },
    },
  );
