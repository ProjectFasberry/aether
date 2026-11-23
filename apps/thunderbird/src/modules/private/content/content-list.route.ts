import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { wrapError } from "@repo/shared/lib/helpers";
import {
  getSiteContent,
  isSitePage,
  siteLocaleSchema,
  toAdminPayload,
  type SiteLocale,
} from "#/modules/site/site.model";

export const adminContentSchema = t.Object({
  page: t.String(),
  locale: siteLocaleSchema,
  draft: t.Any(),
  published: t.Any(),
  version: t.Number(),
  updatedAt: t.Nullable(t.String()),
  updatedBy: t.Nullable(t.String()),
});

const contentQuerySchema = t.Object({ locale: t.Optional(siteLocaleSchema) });

export const contentList = new Elysia()
  .use(validatePermission("content.read"))
  .get(
    "/:page",
    async ({ params: { page }, query, status }) => {
      if (!isSitePage(page)) return status(404, wrapError("SITE_PAGE_NOT_FOUND"));

      const locale: SiteLocale = query.locale ?? "ru";
      const row = await getSiteContent(page, locale);

      // A page nobody has edited yet opens as an empty form with version 0.
      if (!row) {
        return {
          data: {
            page,
            locale,
            draft: null,
            published: null,
            version: 0,
            updatedAt: null,
            updatedBy: null,
          },
        };
      }

      return { data: toAdminPayload(row) };
    },
    {
      params: t.Object({ page: t.String({ minLength: 1, maxLength: 64 }) }),
      query: contentQuerySchema,
      response: {
        200: withData(adminContentSchema),
        404: withError(t.String()),
      },
      detail: {
        summary: buildRouteSummary("Get the draft and published site content"),
      },
    },
  );
