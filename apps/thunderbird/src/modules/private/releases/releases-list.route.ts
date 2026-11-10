import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import {
  RELEASE_CHANNELS,
  listReleases,
  releaseChannels,
  releasesSchema,
  type ReleaseChannel,
} from "./releases.model";

export const releasesList = new Elysia()
  .use(validatePermission("releases.read"))
  .get("/releases", async ({ query, status }) => {
    const channel = query.channel ?? "prod";

    if (!releaseChannels.has(channel)) {
      return status(400, { error: "UNKNOWN_CHANNEL" });
    }

    const data = await listReleases(channel as ReleaseChannel);
    return { data };
  }, {
    query: t.Object({
      channel: t.Optional(t.Union([t.Literal("prod"), t.Literal("dev")])),
    }),
    response: {
      200: withData(releasesSchema),
      400: withError(),
      500: withError(),
    },
    detail: {
      summary: buildRouteSummary("List launcher releases"),
    },
  })
