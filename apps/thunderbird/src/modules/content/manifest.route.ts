import Elysia, { t } from "elysia";
import { BUCKETS, presignPath } from "#/shared/minio/client";
import { defineOptionalBearerSession } from "#/lib/define";
import { wrapError } from "@repo/shared/lib/helpers";
import { buildRouteSummary } from "#/lib/routes";
import { withData } from "#/shared/schemas";
import { CONTENT_PREFIX, readContentManifest } from "./manifest.model";

/** Long enough for slow connections: a big pack or the asset set can take a while. */
const PRESIGN_TTL_S = 60 * 60;

const manifestPayloadSchema = t.Object({
  files: t.Array(
    t.Object({
      path: t.String(),
      hash: t.String(),
      url: t.String(),
      bundle: t.Optional(t.String()),
      minecraft: t.Optional(t.Array(t.String())),
    }),
  ),
  bundles: t.Optional(
    t.Record(
      t.String(),
      t.Object({
        version: t.String(),
        files: t.Array(t.String()),
      }),
    ),
  ),
  expires_in: t.Number(),
});

/**
 * Authenticated replacement for the public `manifest.json` on the volume.
 * Returns the same file list, but every entry carries a presigned URL, so the
 * bucket itself can stay private later without touching the launcher.
 */
export const contentManifest = new Elysia()
  .group("/static", app => app
    .use(defineOptionalBearerSession())
    .get("/manifest", async ({ session, status }) => {
      if (!session) return status(401, wrapError("UNAUTHORIZED"));

      const manifest = await readContentManifest();

      const files = manifest.files.map(file => ({
        ...file,
        url: presignPath(BUCKETS.STATIC, `${CONTENT_PREFIX}${file.path}`, PRESIGN_TTL_S),
      }));

      return {
        data: {
          files,
          bundles: manifest.bundles ?? {},
          expires_in: PRESIGN_TTL_S,
        },
      };
    }, {
      detail: {
        summary: buildRouteSummary("Get presigned content manifest"),
      },
    }),
  );
