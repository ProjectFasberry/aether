import Elysia, { t } from "elysia";
import { buildRouteSummary } from "#/utils";
import { withData } from "#/shared/schemas";
import { readLatest, rewritePlatforms } from "#/modules/releases";
import { joinGate } from "./join.route";

/**
 * Launcher downloads are resolved from the newest `prod` release manifest, so a
 * published build becomes downloadable without touching the app or the database.
 * The stale `launcher-windows` / `launcher-macos` rows in `ip_list` are unused.
 */
const PLATFORMS = ["windows-x86_64", "darwin-aarch64"] as const;

const artifactSchema = t.Object({
  platform: t.UnionEnum(["windows-x86_64", "darwin-aarch64"]),
  url: t.Nullable(t.String()),
});

/** Same origin trick as the release API: Traefik terminates TLS, we do not. */
function publicOrigin(request: Request): string {
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");

  return `${proto}://${url.host}`;
}

async function platformUrls(request: Request): Promise<Record<string, string>> {
  const latest = await readLatest("prod");

  if (!latest) return {};

  const platforms = rewritePlatforms(latest, publicOrigin(request));

  return Object.fromEntries(
    Object.entries(platforms).map(([platform, entry]) => [platform, entry.url]),
  );
}

export const launcher = new Elysia()
  .use(joinGate)
  .get(
    "/launcher",
    async ({ request }) => {
      const urls = await platformUrls(request);

      return {
        data: {
          artifacts: PLATFORMS.map((platform) => ({
            platform,
            url: urls[platform] ?? null,
          })),
        },
      };
    },
    {
      response: {
        200: withData(t.Object({ artifacts: t.Array(artifactSchema) })),
      },
      detail: {
        summary: buildRouteSummary("Launcher builds"),
      },
    },
  )
  .get(
    "/launcher/:platform",
    async ({ params, request, set }) => {
      const urls = await platformUrls(request);
      const url = PLATFORMS.includes(params.platform as (typeof PLATFORMS)[number])
        ? urls[params.platform]
        : undefined;

      if (!url) {
        set.status = 404;
        return { error: "not found" };
      }

      set.status = 302;
      set.headers["location"] = url;
      set.headers["cache-control"] = "public, max-age=300";

      return "";
    },
    {
      detail: {
        summary: buildRouteSummary("Download launcher"),
      },
    },
  );
