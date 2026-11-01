import Elysia from "elysia";
import { BUCKETS, presignPath } from "#/shared/minio/client";
import { buildRouteSummary } from "#/utils";

/**
 * Player heads from the private `avatars` bucket.
 *
 * `volume.fasberry.fun/avatars/...` answers 403 (the bucket is not public), so
 * every consumer that only has the stored URL - the website, the launcher -
 * gets the image through this redirect instead.
 */
const SAFE_FILE = /^[A-Za-z0-9._-]+\.png$/;

/** Presign once per request; the image itself is small and cached by browsers. */
const TTL_S = 60 * 60;

export const avatars = new Elysia().get(
  "/avatars/:file",
  ({ params, set, status }) => {
    if (!SAFE_FILE.test(params.file)) return status(404, { error: "NOT_FOUND" });

    set.status = 302;
    set.headers["location"] = presignPath(BUCKETS.AVATARS, params.file, TTL_S);
    set.headers["cache-control"] = "public, max-age=300";

    return "";
  },
  {
    detail: {
      summary: buildRouteSummary("Player head image"),
    },
  },
);
