import { general } from "#/shared/database/general-db";
import { validatePermission } from "#/lib/validators";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { wrapError } from "@repo/shared/lib/helpers";
import { validateServerContent } from "#/modules/content/manifest.model";
import Elysia, { t } from "elysia";
import { clientModSchema, getServer, loaderSchema, serverSchema } from "./server.model";

/**
 * Origin is the launcher-facing id: it becomes the catalog key, the content
 * bundle name (`server:<origin>`) and the on-disk mods directory, so it is a
 * lowercase slug and never reused.
 */
const originSchema = t.String({ minLength: 2, maxLength: 32, pattern: "^[a-z0-9][a-z0-9-]*$" });

const serverCreateBody = t.Object({
  origin: originSchema,
  fullname: t.String({ minLength: 1, maxLength: 64 }),
  description: t.Optional(t.Nullable(t.String({ maxLength: 1024 }))),
  thumbnail: t.Optional(t.String({ maxLength: 512 })),
  available: t.Optional(t.Boolean()),
  excluded: t.Optional(t.Boolean()),
  is_default: t.Optional(t.Boolean()),
  client_version: t.String({ minLength: 1, maxLength: 32 }),
  loader: loaderSchema,
  loader_version: t.Optional(t.Nullable(t.String({ maxLength: 64 }))),
  java_major: t.Integer({ minimum: 8, maximum: 99 }),
  resource_pack: t.Optional(t.Nullable(t.String({ maxLength: 255 }))),
  client_mod: t.Optional(clientModSchema),
});

export const serverCreate = new Elysia()
  .use(validatePermission("servers.update"))
  .post(
    "/",
    async ({ body, status }) => {
      const origin = body.origin.trim().toLowerCase();

      // Case-insensitive: the unique index compares bytes, and a row added by
      // hand as "Lobby" must still block "lobby".
      const taken = await general
        .selectFrom("servers")
        .select("id")
        .where("origin", "ilike", origin)
        .executeTakeFirst();

      if (taken) return status(409, wrapError(`A server with origin "${origin}" already exists`));

      if (body.loader !== "vanilla" && !body.loader_version?.trim()) {
        return status(400, wrapError(`loader_version is required for ${body.loader}`));
      }

      let problem: string | null;
      try {
        problem = await validateServerContent(body.client_version, body.resource_pack ?? null);
      } catch {
        return status(503, wrapError("Content manifest is unavailable, try again"));
      }
      if (problem) return status(400, wrapError(problem));

      const existing = await general
        .selectFrom("servers")
        .select(({ fn }) => fn.countAll<number>().as("count"))
        .executeTakeFirst();
      const isFirst = Number(existing?.count ?? 0) === 0;
      const makeDefault = body.is_default === true || isFirst;

      const values = {
        origin,
        fullname: body.fullname.trim(),
        description: body.description?.trim() || null,
        thumbnail: body.thumbnail?.trim() ?? "",
        available: body.available ?? false,
        excluded: body.excluded ?? false,
        is_default: makeDefault,
        client_version: body.client_version.trim(),
        loader: body.loader,
        loader_version: body.loader_version?.trim() || null,
        java_major: body.java_major,
        resource_pack: body.resource_pack?.trim() || null,
        client_mod: body.client_mod ?? "required",
      };

      const inserted = await general.transaction().execute(async (trx) => {
        // The unique partial index allows one default; clear the old one first.
        if (makeDefault) {
          await trx.updateTable("servers").set({ is_default: false }).where("is_default", "=", true).execute();
        }

        return trx.insertInto("servers").values(values).returning("id").executeTakeFirstOrThrow();
      });

      return { data: (await getServer(inserted.id))! };
    },
    {
      body: serverCreateBody,
      response: {
        200: withData(serverSchema),
        409: withError(t.String()),
        400: withError(t.String()),
        503: withError(t.String()),
      },
      detail: {
        summary: buildRouteSummary("Create a server: runtime, availability and presentation"),
      },
    },
  );
