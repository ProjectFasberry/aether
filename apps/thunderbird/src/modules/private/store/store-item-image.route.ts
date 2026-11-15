import Elysia, { t } from "elysia";
import * as z from "zod";
import { BUCKETS, S3 } from "#/shared/minio/client";
import { validatePermission } from "#/lib/validators";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { wrapError } from "@repo/shared/lib/helpers";

const MAX_BYTES = 2 * 1024 * 1024;

const EXT = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

const imageBodySchema = z.object({
  file: z
    .file()
    .min(1)
    .max(MAX_BYTES)
    .mime(["image/png", "image/jpeg", "image/webp"]),
});

/**
 * Product images live in the public `static` bucket; the database stores the
 * key (`store/<uuid>.<ext>`) and the panel prefixes it with `VITE_VOLUME_URL`.
 */
export const storeItemImage = new Elysia()
  .use(validatePermission("store.item.create"))
  .post("/image", async ({ body, status }) => {
    const ext = EXT[body.file.type as keyof typeof EXT];
    if (!ext) return status(400, wrapError("IMAGE_TYPE_NOT_ALLOWED"));

    const key = `store/${crypto.randomUUID()}.${ext}`;
    await S3.getClient(BUCKETS.STATIC).write(key, body.file, { type: body.file.type });

    return { data: { key } };
  }, {
    parse: "multipart/form-data",
    body: imageBodySchema,
    response: {
      200: withData(t.Object({ key: t.String() })),
      400: withError(),
    },
    detail: {
      summary: buildRouteSummary("Upload a store item image"),
    },
  });
