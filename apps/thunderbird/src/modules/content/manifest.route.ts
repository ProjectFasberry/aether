import Elysia, { t } from "elysia";
import { BUCKETS, presignPath, S3 } from "#/shared/minio/client";
import { defineOptionalBearerSession } from "#/lib/define";
import { wrapError } from "@repo/shared/lib/helpers";
import { buildRouteSummary } from "#/utils";
import { withData } from "#/shared/schemas";

/** Object key of the content manifest inside the `static` bucket. */
const MANIFEST_KEY = "resourcepack/manifest.json";
/** Everything listed in the manifest lives under this prefix. */
const CONTENT_PREFIX = "resourcepack/";
/** Long enough for slow connections: a big pack or the asset set can take a while. */
const PRESIGN_TTL_S = 60 * 60;

type ManifestEntry = {
  path: string;
  hash: string;
  /** Content bundle: omitted and `base` are installed always, `server:<id>` per backend. */
  bundle?: string;
};

type ManifestBundle = {
  version: string;
  files: string[];
};

type Manifest = {
  files: ManifestEntry[];
  bundles?: Record<string, ManifestBundle>;
};

const manifestPayloadSchema = t.Object({
  files: t.Array(
    t.Object({
      path: t.String(),
      hash: t.String(),
      url: t.String(),
      bundle: t.Optional(t.String()),
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

      const bucket = S3.getClient(BUCKETS.STATIC);
      const manifest = (await bucket.file(MANIFEST_KEY).json()) as Manifest;

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
