import Elysia, { t } from "elysia";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { wrapError } from "@repo/shared/lib/helpers";
import { defineOptionalSession, getUserRole, resolveNickname } from "#/lib/define";
import { getPermissions } from "#/modules/user/me.model";
import {
  getEditableContent,
  getPublishedBatch,
  getPublishedContent,
  isSitePage,
  SITE_PAGE_NAMES,
  siteLocaleSchema,
  type SiteLocale,
  type SitePage,
} from "./site.model";

export const siteContentSchema = t.Object({
  page: t.String(),
  locale: siteLocaleSchema,
  content: t.Any(),
  version: t.Number(),
  updatedAt: t.Nullable(t.String()),
});

const contentQuerySchema = t.Object({
  locale: t.Optional(siteLocaleSchema),
  /** Comma-separated page slugs; every registered page when omitted. */
  pages: t.Optional(t.String({ maxLength: 256 })),
});

/** Resolve the pages from the query, dropping unknown slugs. */
function requestedPages(value: string | undefined): SitePage[] {
  if (!value) return SITE_PAGE_NAMES;

  return value
    .split(",")
    .map((page) => page.trim())
    .filter(isSitePage);
}

export const siteContent = new Elysia()
  .use(defineOptionalSession())
  .get(
    "/content",
    async ({ query, set }) => {
      const locale: SiteLocale = query.locale ?? "ru";
      const pages = requestedPages(query.pages);

      // A short public cache evens out the landing traffic; a publish bumps the
      // version, so a stale copy is at most one minute old.
      set.headers["cache-control"] = "public, max-age=30, stale-while-revalidate=120";

      return { data: await getPublishedBatch(pages, locale) };
    },
    {
      query: contentQuerySchema,
      response: {
        200: withData(t.Record(t.String(), siteContentSchema)),
      },
      detail: {
        summary: buildRouteSummary("Get published site content for pages"),
      },
    },
  )
  .get(
    "/content/:page",
    async ({ params: { page }, query, request, session, status, set }) => {
      if (!isSitePage(page)) return status(404, wrapError("SITE_PAGE_NOT_FOUND"));

      const locale: SiteLocale = query.locale ?? "ru";

      // `draft=1` is the live preview inside the site: the same cookie session as
      // the panel, but the permission is re-checked here.
      if (query.draft === "1") {
        const nickname = await resolveNickname(request, session);

        if (nickname) {
          const role = await getUserRole(nickname);

          if (role && (await getPermissions(nickname, role.id)).has("content.update")) {
            set.headers["cache-control"] = "no-store";

            return { data: await getEditableContent(page, locale) };
          }
        }

        return status(403, wrapError("FORBIDDEN"));
      }

      set.headers["cache-control"] = "public, max-age=30, stale-while-revalidate=120";

      return { data: await getPublishedContent(page, locale) };
    },
    {
      params: t.Object({ page: t.String({ minLength: 1, maxLength: 64 }) }),
      query: t.Object({
        locale: t.Optional(siteLocaleSchema),
        draft: t.Optional(t.String({ maxLength: 1 })),
      }),
      response: {
        200: withData(siteContentSchema),
        403: withError(t.String()),
        404: withError(t.String()),
      },
      detail: {
        summary: buildRouteSummary("Get published content for one site page"),
      },
    },
  );
