import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { permissionsService } from "#/shared/constants/permissions";
import { BUCKETS, presignPath } from "#/shared/minio/client";
import { buildRouteSummary } from "#/utils";
import { releaseChannels, releaseKey } from "./releases.model";

/** Same rule as the public launcher routes: one plain path segment, no traversal. */
const SAFE_SEGMENT = /^[A-Za-z0-9._+-]+$/;
const DOWNLOAD_TTL_S = 60 * 10;

function safe(value: string | undefined): value is string {
  return Boolean(value) && SAFE_SEGMENT.test(value as string) && !value!.includes("..");
}

export const releasesDownload = new Elysia()
  .use(validatePermission(permissionsService.get("RELEASES.READ")))
  .get("/releases/:channel/:version/:platform/:file", ({ params, status }) => {
    const { channel, version, platform, file } = params;

    if (
      !releaseChannels.has(channel) ||
      !safe(version) ||
      !safe(platform) ||
      !safe(file)
    ) {
      return status(404, { error: "NOT_FOUND" });
    }

    const url = presignPath(BUCKETS.RELEASES, releaseKey(channel, version, platform, file), DOWNLOAD_TTL_S);

    return new Response(null, {
      status: 302,
      headers: {
        location: url,
        // A presigned URL is single-purpose; never let the panel cache it.
        "cache-control": "no-store",
      },
    });
  }, {
    params: t.Object({
      channel: t.String(),
      version: t.String({ maxLength: 64 }),
      platform: t.String({ maxLength: 64 }),
      file: t.String({ maxLength: 256 }),
    }),
    detail: {
      summary: buildRouteSummary("Download a launcher release artifact"),
    },
  })
