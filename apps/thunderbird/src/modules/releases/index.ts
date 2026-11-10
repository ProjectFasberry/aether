import Elysia, { t } from "elysia";
import { BUCKETS, S3, presignPath } from "#/shared/minio/client";
import { buildRouteSummary } from "#/lib/routes";
import { wrapError } from "@repo/shared/lib/helpers";
import { auth } from "#/modules/auth/auth.model";
import { defineOptionalBearerSession, handleByBearer } from "#/lib/define";
import { getEnv } from "#/shared/env";

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

/** Channel manifest of the latest release; the launcher updater polls it. */
type LatestHandlerContext = {
  params: { channel: string };
  request: Request;
  status: (code: number, response?: unknown) => unknown;
};

async function latestHandler({ params, request, status }: LatestHandlerContext) {
  const latest = await readLatest(params.channel);

  if (!latest) return status(404, wrapError("NOT_FOUND"));

  // Behind Traefik the request is plain http; the forwarded header is the
  // only reliable source of the public scheme.
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const origin = `${proto}://${url.host}`;

  return { ...latest, platforms: rewritePlatforms(latest, origin) };
}

/**
 * The public download route carries no channel in its path, so the environment
 * itself decides what it serves: the prod image serves `prod`, everything else
 * (staging, local) serves `dev`. The dev artifact is not public.
 */
function currentChannel(): "prod" | "dev" {
  return getEnv().STAGE === "prod" ? "prod" : "dev";
}

/** Latest artifact of a platform, resolved from the channel manifest. */
async function latestArtifact(channel: string, platform: string) {
  const latest = await readLatest(channel);
  if (!latest) return null;

  const entry = latest.platforms?.[platform];
  if (!entry?.url) return null;

  let file: string;

  try {
    file = decodeURIComponent(new URL(entry.url).pathname.split("/").pop() ?? "");
  } catch {
    return null;
  }

  if (!safe(file)) return null;

  return {
    version: latest.version,
    key: `${PREFIX}${channel}/${latest.version}/${platform}/${file}`,
    file,
  };
}

/** Dev downloads are for the team only: a session or an API key is required. */
async function canDownloadDev(headers: Record<string, string | undefined>, session: string | null) {
  const nickname = session ? await auth.getUserNickname(session) : null;
  if (nickname) return true;

  const bearer = headers.authorization?.replace(/^Bearer\s+/i, "").trim() ?? "";

  return bearer ? await handleByBearer(bearer) : false;
}

const latestDownload = new Elysia()
  .use(defineOptionalBearerSession())
  .get(
    "/download/:platform",
    async ({ params, headers, session, status }) => {
      const channel = currentChannel();

      if (channel !== "prod" && !(await canDownloadDev(headers, session))) {
        return status(401, wrapError("UNAUTHORIZED"));
      }

      const artifact = await latestArtifact(channel, params.platform);

      if (!artifact) return status(404, wrapError("NOT_FOUND"));

      const url = presignPath(BUCKETS.RELEASES, artifact.key, DOWNLOAD_TTL_S);

      return new Response(null, {
        status: 302,
        headers: {
          location: url,
          // A stable link may be cached briefly; the presign inside it is fresh.
          "cache-control": channel === "prod" ? "public, max-age=300" : "no-store",
        },
      });
    },
    {
      params: t.Object({
        platform: t.String({ maxLength: 64 }),
      }),
      detail: {
        summary: buildRouteSummary("Download the latest launcher build for a platform"),
      },
    },
  );

export const releases = new Elysia()
  .group("/releases", app => app
    .use(latestDownload)
    .get("/:channel/latest.json", latestHandler, {
      detail: {
        summary: buildRouteSummary("Latest launcher release"),
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
