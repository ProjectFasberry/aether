import Elysia from "elysia";
import { BUCKETS, S3, presignPath } from "#/shared/minio/client";
import { buildRouteSummary } from "#/utils";
import { wrapError } from "@repo/shared/lib/helpers";

/**
 * Public launcher releases. Artifacts live in the private `releases` bucket, so
 * clients never talk to rustfs directly: `latest.json` is rewritten to point at
 * this API and downloads are a redirect to a short-lived presigned URL.
 */
const PREFIX = "fasberry/";
const CHANNELS = new Set(["dev", "prod"]);
/** Presigned links only need to survive one download. */
const DOWNLOAD_TTL_S = 60 * 10;
/** No slashes, no traversal: every path segment is a plain file name. */
const SAFE_SEGMENT = /^[A-Za-z0-9._+-]+$/;

function safe(value: string | undefined): value is string {
  return Boolean(value) && SAFE_SEGMENT.test(value as string) && !value!.includes("..");
}

export type Latest = {
  version: string;
  notes: string;
  platforms: Record<string, { signature: string; url: string }>;
};

/** Newest release manifest of a channel, or `null` when it was never published. */
export async function readLatest(channel: string): Promise<Latest | null> {
  if (!CHANNELS.has(channel)) return null;

  const bucket = S3.getClient(BUCKETS.RELEASES);

  return (await bucket
    .file(`${PREFIX}${channel}/latest.json`)
    .json()
    .catch(() => null)) as Latest | null;
}

/**
 * Stored URLs point at rustfs (`/releases/fasberry/...`); hand out API links
 * instead, without the bucket prefix the API already implies.
 */
export function rewritePlatforms(latest: Latest, origin: string) {
  return Object.fromEntries(
    Object.entries(latest.platforms).map(([platform, entry]) => {
      const key = new URL(entry.url).pathname.split("/").slice(2).join("/");
      const relative = key.replace(/^fasberry\//, "");

      return [platform, { ...entry, url: `${origin}/releases/${relative}` }];
    }),
  ) as Latest["platforms"];
}

/** Shared by `/latest` (documented) and `/latest.json` (alias for tools). */
async function latestHandler({ params, request, status }: any) {
      const latest = await readLatest(params.channel);

      if (!latest) return status(404, wrapError("NOT_FOUND"));

      // Behind Traefik the request is plain http; the forwarded header is the
      // only reliable source of the public scheme.
      const url = new URL(request.url);
      const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
      const origin = `${proto}://${url.host}`;

      return { ...latest, platforms: rewritePlatforms(latest, origin) };
}

export const releases = new Elysia()
  .group("/releases", app => app
    .get("/:channel/latest", latestHandler, {
      detail: {
        summary: buildRouteSummary("Latest launcher release"),
      },
    })
    .get("/:channel/latest.json", latestHandler, {
      detail: {
        summary: buildRouteSummary("Latest launcher release (json alias)"),
      },
    })
    .get("/:channel/:version/:platform/:file", ({ params, status }) => {
      const { channel, version, platform, file } = params;

      if (!CHANNELS.has(channel) || !safe(version) || !safe(platform) || !safe(file)) {
        return status(404, wrapError("NOT_FOUND"));
      }

      const key = `${PREFIX}${channel}/${version}/${platform}/${file}`;
      const url = presignPath(BUCKETS.RELEASES, key, DOWNLOAD_TTL_S);

      return new Response(null, {
        status: 302,
        headers: { location: url },
      });
    }, {
      detail: {
        summary: buildRouteSummary("Download a launcher release artifact"),
      },
    })
  );
