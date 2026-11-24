import { general } from "#/shared/database/general-db";
import { sql } from "kysely";
import type { Json } from "@gen/db/general";
import type { SiteContentPayload, SiteLocale, SitePage } from "./site.schema";

export * from "./site.schema";

/**
 * Editable landing content, one JSON document per page and locale.
 *
 * The site keeps its copy in paraglide messages; this table stores only the
 * fields an editor changed. `draft` is what the panel and the live preview
 * read, `published` is what the public page renders.
 */

export type SiteContentRow = {
  page: string;
  locale: string;
  draft: unknown;
  published: unknown;
  version: number;
  updated_at: string | Date | null;
  updated_by: string | null;
};

export async function getSiteContent(page: SitePage, locale: SiteLocale): Promise<SiteContentRow | null> {
  const row = await general
    .selectFrom("site_content")
    .selectAll()
    .where("page", "=", page)
    .where("locale", "=", locale)
    .executeTakeFirst();

  return row ?? null;
}

export async function getPublishedContent(page: SitePage, locale: SiteLocale): Promise<SiteContentPayload> {
  const row = await getSiteContent(page, locale);

  return toPublicPayload(page, locale, row);
}

export async function getPublishedBatch(
  pages: SitePage[],
  locale: SiteLocale,
): Promise<Record<string, SiteContentPayload>> {
  if (pages.length === 0) return {};

  const rows = await general
    .selectFrom("site_content")
    .selectAll()
    .where("page", "in", pages)
    .where("locale", "=", locale)
    .execute();

  const byPage = new Map(rows.map((row) => [row.page, row]));

  return Object.fromEntries(
    pages.map((page) => [page, toPublicPayload(page, locale, byPage.get(page) ?? null)]),
  );
}

/**
 * The editor's view: the draft when it exists, the published document otherwise.
 * Guarded by the route; callers must check `content.update` first.
 */
export async function getEditableContent(page: SitePage, locale: SiteLocale): Promise<SiteContentPayload> {
  const row = await getSiteContent(page, locale);

  return {
    page,
    locale,
    content: row?.draft ?? row?.published ?? null,
    version: row?.version ?? 0,
    updatedAt: toIso(row?.updated_at ?? null),
  };
}

export async function saveDraft(input: {
  page: SitePage;
  locale: SiteLocale;
  content: unknown;
  version: number;
  nickname: string;
}): Promise<SiteContentRow | null> {
  const row = await general
    .insertInto("site_content")
    .values({
      page: input.page,
      locale: input.locale,
      draft: input.content as Json,
      version: 1,
      updated_at: new Date(),
      updated_by: input.nickname,
    })
    .onConflict((oc) => oc
      .columns(["page", "locale"])
      .doUpdateSet((eb) => ({
        draft: eb.ref("excluded.draft"),
        version: sql`site_content.version + 1`,
        updated_at: new Date(),
        updated_by: eb.ref("excluded.updated_by"),
      }))
      .where("site_content.version", "=", input.version))
    .returningAll()
    .executeTakeFirst();

  return row ?? null;
}

export async function publishDraft(input: {
  page: SitePage;
  locale: SiteLocale;
  version: number;
  nickname: string;
}): Promise<SiteContentRow | null> {
  const row = await general
    .updateTable("site_content")
    .set({
      published: sql`draft`,
      version: sql`site_content.version + 1`,
      updated_at: new Date(),
      updated_by: input.nickname,
    })
    .where("page", "=", input.page)
    .where("locale", "=", input.locale)
    .where("draft", "is not", null)
    .where("version", "=", input.version)
    .returningAll()
    .executeTakeFirst();

  return row ?? null;
}

export async function discardDraft(input: {
  page: SitePage;
  locale: SiteLocale;
  version: number;
  nickname: string;
}): Promise<SiteContentRow | null> {
  const row = await general
    .updateTable("site_content")
    .set({
      draft: null,
      version: sql`site_content.version + 1`,
      updated_at: new Date(),
      updated_by: input.nickname,
    })
    .where("page", "=", input.page)
    .where("locale", "=", input.locale)
    .where("version", "=", input.version)
    .returningAll()
    .executeTakeFirst();

  return row ?? null;
}

export function toAdminPayload(row: SiteContentRow) {
  return {
    page: row.page,
    locale: row.locale,
    draft: row.draft,
    published: row.published,
    version: row.version,
    updatedAt: toIso(row.updated_at),
    updatedBy: row.updated_by,
  };
}

export function toPublicPayload(
  page: SitePage,
  locale: SiteLocale,
  row: SiteContentRow | null,
): SiteContentPayload {
  return {
    page,
    locale,
    content: row?.published ?? null,
    version: row?.version ?? 0,
    updatedAt: toIso(row?.updated_at ?? null),
  };
}

function toIso(value: string | Date | null): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();

  return new Date(value).toISOString();
}
