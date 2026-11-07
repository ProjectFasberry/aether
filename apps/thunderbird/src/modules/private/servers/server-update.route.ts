import { general } from "#/shared/database/general-db";
import { validatePermission } from "#/lib/validators";
import { permissionsService } from "#/shared/constants/permissions";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";
import { wrapError } from "@repo/shared/lib/helpers";
import Elysia, { t } from "elysia";
import { getServer, serverSchema } from "./server.model";

const loaderSchema = t.UnionEnum(["fabric", "quilt", "neoforge", "forge", "vanilla"]);
const clientModSchema = t.UnionEnum(["required", "optional"]);

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
  .use(validatePermission(permissionsService.get("SERVERS.UPDATE")))
  .patch(
    "/:id",
    async ({ params: { id }, body, status }) => {
      const existing = await getServer(id);

      if (!existing) return status(404, wrapError("SERVER_NOT_FOUND"));

      if (Object.keys(body).length === 0) return { data: existing };

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
      },
      detail: {
        summary: buildRouteSummary("Update a server: availability, runtime and presentation"),
      },
    },
  );
