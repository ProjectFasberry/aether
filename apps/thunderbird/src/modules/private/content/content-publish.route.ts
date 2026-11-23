import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { wrapError } from "@repo/shared/lib/helpers";
import { createAdminActivityLog } from "../private.model";
import {
  discardDraft,
  getSiteContent,
  isSitePage,
  publishDraft,
  siteLocaleSchema,
  toAdminPayload,
} from "#/modules/site/site.model";
import { adminContentSchema } from "./content-list.route";

const versionBodySchema = t.Object({
  version: t.Integer({ minimum: 0 }),
});

export const contentPublish = new Elysia()
  .use(validatePermission("content.publish"))
  .post(
    "/:page/:locale/publish",
    async ({ params: { page, locale }, body, nickname, status }) => {
      if (!isSitePage(page)) return status(404, wrapError("SITE_PAGE_NOT_FOUND"));

      const row = await publishDraft({ page, locale, version: body.version, nickname });
      if (row) return { data: toAdminPayload(row) };

      const current = await getSiteContent(page, locale);
      if (!current) return status(404, wrapError("CONTENT_NOT_FOUND"));
      if (current.draft === null) return status(400, wrapError("DRAFT_EMPTY"));

      return status(409, wrapError("VERSION_CONFLICT"));
    },
    {
      params: t.Object({
        page: t.String({ minLength: 1, maxLength: 64 }),
        locale: siteLocaleSchema,
      }),
      body: versionBodySchema,
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
            metadata: { page: params.page, locale: params.locale },
          });
        }
      },
      detail: {
        summary: buildRouteSummary("Publish the site content draft"),
      },
    },
  )
  .post(
    "/:page/:locale/discard",
    async ({ params: { page, locale }, body, nickname, status }) => {
      if (!isSitePage(page)) return status(404, wrapError("SITE_PAGE_NOT_FOUND"));

      const row = await discardDraft({ page, locale, version: body.version, nickname });
      if (row) return { data: toAdminPayload(row) };

      const current = await getSiteContent(page, locale);
      if (!current) return status(404, wrapError("CONTENT_NOT_FOUND"));

      return status(409, wrapError("VERSION_CONFLICT"));
    },
    {
      params: t.Object({
        page: t.String({ minLength: 1, maxLength: 64 }),
        locale: siteLocaleSchema,
      }),
      body: versionBodySchema,
      response: {
        200: withData(adminContentSchema),
        404: withError(t.String()),
        409: withError(t.String()),
      },
      afterResponse: ({ nickname: initiator, permission, params }) => {
        if (initiator) {
          createAdminActivityLog({
            event: permission,
            initiator,
            metadata: { page: params.page, locale: params.locale, discarded: true },
          });
        }
      },
      detail: {
        summary: buildRouteSummary("Discard the site content draft"),
      },
    },
  );
