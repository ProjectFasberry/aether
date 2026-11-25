import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { wrapError } from "@repo/shared/lib/helpers";
import { publishedClientVersions } from "#/modules/content/manifest.model";

/**
 * Versions offered by the panel's create/edit form: only those with published
 * content, because any other value would produce a server the launcher cannot
 * install.
 */
export const serverClientVersions = new Elysia()
  .use(validatePermission("servers.read"))
  .get(
    "/client-versions",
    async ({ status }) => {
      try {
        return { data: await publishedClientVersions() };
      } catch {
        return status(503, wrapError("Content manifest is unavailable, try again"));
      }
    },
    {
      response: {
        200: withData(t.Array(t.String())),
        503: withError(t.String()),
      },
      detail: {
        summary: buildRouteSummary("List client versions with published content"),
      },
    },
  );
