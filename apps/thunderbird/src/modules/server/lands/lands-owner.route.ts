import Elysia, { t } from "elysia";
import * as z from "zod";
import { bisquite } from "#/shared/database/bisquite-db";
import { BUCKETS, S3 } from "#/shared/minio/client";
import { playerService } from "#/shared/services/player";
import { defineRequiredUser } from "#/lib/define";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { wrapError } from "@repo/shared/lib/helpers";
import { safeJsonParse } from "#/utils";

const LANDS_BUCKET = BUCKETS.LANDS;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_GALLERY = 12;

const EXT = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

const imageSchema = z.object({
  file: z
    .file()
    .min(1)
    .max(MAX_IMAGE_BYTES)
    .mime(["image/png", "image/jpeg", "image/webp"]),
});

const titleSchema = z.object({
  title: z.string().max(300).nullable(),
});

const galleryDeleteSchema = z.object({
  url: z.string().min(1),
});

async function ownerUuidFor(nickname: string): Promise<string | null> {
  const row = await bisquite
    .selectFrom("lands_players")
    .select("uuid")
    .where("name", "=", nickname)
    .executeTakeFirst();

  if (row?.uuid) return row.uuid;

  return playerService.getUuid(nickname).catch(() => null);
}

async function isLandOwner(ulid: string, nickname: string): Promise<boolean> {
  const row = await bisquite
    .selectFrom("lands_lands")
    .select("members")
    .where("ulid", "=", ulid)
    .executeTakeFirst();

  if (!row) return false;

  const parsed = safeJsonParse<Record<string, { chunks: number }>>(row.members);
  if (!parsed.ok) return false;

  const ownerUuid = Object.keys(parsed.value)[0];
  if (!ownerUuid) return false;

  return (await ownerUuidFor(nickname)) === ownerUuid;
}

function extensionOf(file: File): string | null {
  return EXT[file.type as keyof typeof EXT] ?? null;
}

async function putImage(file: File, prefix: string, ulid: string): Promise<string> {
  const ext = extensionOf(file);
  if (!ext) throw new Error("IMAGE_TYPE_NOT_ALLOWED");

  const key = `${prefix}/${ulid}-${crypto.randomUUID()}.${ext}`;
  await S3.getClient(LANDS_BUCKET).write(key, file, { type: file.type });

  return key;
}

/** Best-effort object cleanup: a failed delete must not fail the request. */
async function removeObject(key: string | null | undefined) {
  if (!key || key.startsWith("http")) return;

  await S3.getClient(LANDS_BUCKET).delete(key).catch(() => undefined);
}

export const landsOwner = new Elysia()
  .use(defineRequiredUser())
  .patch("/:ulid", async ({ params: { ulid }, body, nickname, status }) => {
    if (!(await isLandOwner(ulid, nickname))) {
      return status(403, wrapError("NOT_LAND_OWNER"));
    }

    await bisquite
      .updateTable("lands_lands")
      .set({ title: body.title })
      .where("ulid", "=", ulid)
      .execute();

    return { data: { title: body.title } };
  }, {
    params: t.Object({ ulid: t.String({ min: 3 }) }),
    body: titleSchema,
    response: {
      200: withData(t.Object({ title: t.Nullable(t.String()) })),
      403: withError(t.UnionEnum(["NOT_LAND_OWNER"])),
    },
    detail: {
      summary: buildRouteSummary("Update a land description as its owner"),
    },
  })
  .post("/:ulid/banner", async ({ params: { ulid }, body, nickname, status }) => {
    if (!(await isLandOwner(ulid, nickname))) {
      return status(403, wrapError("NOT_LAND_OWNER"));
    }

    const previous = await bisquite
      .selectFrom("lands_banners")
      .select("banner_url")
      .where("ulid", "=", ulid)
      .executeTakeFirst();

    const key = await putImage(body.file, "banners", ulid);

    await bisquite
      .insertInto("lands_banners")
      .values({ ulid, banner_url: key })
      .onDuplicateKeyUpdate({ banner_url: key })
      .execute();

    await removeObject(previous?.banner_url);

    return { data: { key } };
  }, {
    parse: "multipart/form-data",
    params: t.Object({ ulid: t.String({ min: 3 }) }),
    body: imageSchema,
    response: {
      200: withData(t.Object({ key: t.String() })),
      403: withError(t.UnionEnum(["NOT_LAND_OWNER"])),
    },
    detail: {
      summary: buildRouteSummary("Upload a land banner as its owner"),
    },
  })
  .delete("/:ulid/banner", async ({ params: { ulid }, nickname, status }) => {
    if (!(await isLandOwner(ulid, nickname))) {
      return status(403, wrapError("NOT_LAND_OWNER"));
    }

    const previous = await bisquite
      .selectFrom("lands_banners")
      .select("banner_url")
      .where("ulid", "=", ulid)
      .executeTakeFirst();

    await bisquite.deleteFrom("lands_banners").where("ulid", "=", ulid).execute();
    await removeObject(previous?.banner_url);

    return { data: "OK" as const };
  }, {
    params: t.Object({ ulid: t.String({ min: 3 }) }),
    response: {
      200: withData(t.Literal("OK")),
      403: withError(t.UnionEnum(["NOT_LAND_OWNER"])),
    },
    detail: {
      summary: buildRouteSummary("Remove a land banner as its owner"),
    },
  })
  .post("/:ulid/gallery", async ({ params: { ulid }, body, nickname, status }) => {
    if (!(await isLandOwner(ulid, nickname))) {
      return status(403, wrapError("NOT_LAND_OWNER"));
    }

    const rows = await bisquite
      .selectFrom("lands_gallery")
      .select("id")
      .where("ulid", "=", ulid)
      .execute();

    if (rows.length >= MAX_GALLERY) {
      return status(400, wrapError("GALLERY_LIMIT_REACHED"));
    }

    const key = await putImage(body.file, "gallery", ulid);

    await bisquite
      .insertInto("lands_gallery")
      .values({ ulid, url: key })
      .execute();

    return { data: { key } };
  }, {
    parse: "multipart/form-data",
    params: t.Object({ ulid: t.String({ min: 3 }) }),
    body: imageSchema,
    response: {
      200: withData(t.Object({ key: t.String() })),
      400: withError(t.UnionEnum(["GALLERY_LIMIT_REACHED"])),
      403: withError(t.UnionEnum(["NOT_LAND_OWNER"])),
    },
    detail: {
      summary: buildRouteSummary("Add a land gallery image as its owner"),
    },
  })
  .delete("/:ulid/gallery", async ({ params: { ulid }, body, nickname, status }) => {
    if (!(await isLandOwner(ulid, nickname))) {
      return status(403, wrapError("NOT_LAND_OWNER"));
    }

    const row = await bisquite
      .selectFrom("lands_gallery")
      .select(["id", "url"])
      .where("ulid", "=", ulid)
      .where("url", "=", body.url)
      .executeTakeFirst();

    if (!row) return status(404, wrapError("GALLERY_IMAGE_NOT_FOUND"));

    await bisquite.deleteFrom("lands_gallery").where("id", "=", row.id).execute();
    await removeObject(row.url);

    return { data: "OK" as const };
  }, {
    params: t.Object({ ulid: t.String({ min: 3 }) }),
    body: galleryDeleteSchema,
    response: {
      200: withData(t.Literal("OK")),
      403: withError(t.UnionEnum(["NOT_LAND_OWNER"])),
      404: withError(t.UnionEnum(["GALLERY_IMAGE_NOT_FOUND"])),
    },
    detail: {
      summary: buildRouteSummary("Remove a land gallery image as its owner"),
    },
  });
