import Elysia, { t } from "elysia";
import { Value } from "@sinclair/typebox/value";
import { validatePermission } from "#/lib/validators";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { wrapError } from "@repo/shared/lib/helpers";
import { createAdminActivityLog } from "../private.model";
import {
  isSitePage,
  saveDraft,
  SITE_PAGES,
  siteLocaleSchema,
  toAdminPayload,
  type SiteLocale,
} from "#/modules/site/site.model";
import { adminContentSchema } from "./content-list.route";

const draftBodySchema = t.Object({
  /** Version the editor started from; a mismatch is a concurrent edit. */
  version: t.Integer({ minimum: 0 }),
  content: t.Any(),
});

export const contentDraft = new Elysia()
  .use(validatePermission("content.update"))
  .put(
    "/:page/:locale",
    async ({ params: { page, locale }, body, nickname, status }) => {
      if (!isSitePage(page)) return status(404, wrapError("SITE_PAGE_NOT_FOUND"));

      if (!Value.Check(SITE_PAGES[page], body.content)) {
        return status(400, wrapError("CONTENT_INVALID"));
      }

      const row = await saveDraft({
        page,
        locale,
        content: body.content,
        version: body.version,
        nickname,
      });

      if (!row) return status(409, wrapError("VERSION_CONFLICT"));

      return { data: toAdminPayload(row) };
    },
    {
      params: t.Object({
        page: t.String({ minLength: 1, maxLength: 64 }),
        locale: siteLocaleSchema,
      }),
      body: draftBodySchema,
      response: {
        200: withData(adminContentSchema),
        400: withError(t.String()),
        404: withError(t.String()),
        409: withError(t.String()),
      },
      afterResponse: ({ nickname: initiator, permission, params }) => {
        if (initiator) {
          createAdminActivityLog({
            event: permission,
            initiator,
            metadata: { page: params.page, locale: params.locale, draft: true },
          });
        }
      },
      detail: {
        summary: buildRouteSummary("Save a draft of site content"),
      },
    },
  );
