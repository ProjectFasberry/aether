import Elysia, { t } from "elysia";
import { buildRouteSummary } from "#/utils";
import { withData } from "#/shared/schemas";
import { urlsService } from "#/shared/services/urls";

/**
 * Launcher builds live in the public bucket, but the links are kept in the
 * `ip_list` url registry (same place as `server-proxy`), so the app never
 * hardcodes a path and a new build can be published without a redeploy.
 */
const PLATFORMS = [
  { platform: "windows-x86_64", key: "launcher-windows" },
  { platform: "darwin-aarch64", key: "launcher-macos" },
] as const;

/** `ip_list` holds either a full url or a bare host for the other entries. */
const toUrl = (value: string | undefined) => {
  if (!value) return null;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
};

const artifactSchema = t.Object({
  platform: t.UnionEnum(["windows-x86_64", "darwin-aarch64"]),
  url: t.Nullable(t.String()),
});

export const launcher = new Elysia()
  .get(
    "/launcher",
    () => {
      const urls = urlsService.getData();

      return {
        data: {
          artifacts: PLATFORMS.map(({ platform, key }) => ({
            platform,
            url: toUrl(urls.get(key)),
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
    ({ params, set }) => {
      const entry = PLATFORMS.find((item) => item.platform === params.platform);
      const url = toUrl(entry ? urlsService.getData().get(entry.key) : undefined);

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
