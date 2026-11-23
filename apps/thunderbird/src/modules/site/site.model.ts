import { general } from "#/shared/database/general-db";
import { sql } from "kysely";
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

const CONTENT_COLUMNS = sql`
  page, locale, draft, published, version, updated_at, updated_by
`;

/**
 * The generated Kysely types predate `site_content`, so this module talks to the
 * table through tagged SQL. Regenerate `pkgs/shared/.out` and the query can move
 * to the typed builder without changing the routes.
 */
export async function getSiteContent(page: SitePage, locale: SiteLocale): Promise<SiteContentRow | null> {
  const result = await sql<SiteContentRow>`
    SELECT ${CONTENT_COLUMNS}
    FROM site_content
    WHERE page = ${page} AND locale = ${locale}
    LIMIT 1
  `.execute(general);

  return result.rows[0] ?? null;
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

  const pageList = sql.join(pages.map((page) => sql`${page}`), sql`, `);

  const result = await sql<SiteContentRow>`
    SELECT ${CONTENT_COLUMNS}
    FROM site_content
    WHERE page IN (${pageList}) AND locale = ${locale}
  `.execute(general);

  const byPage = new Map(result.rows.map((row) => [row.page, row]));

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
  const result = await sql<SiteContentRow>`
    INSERT INTO site_content AS sc (page, locale, draft, version, updated_at, updated_by)
    VALUES (${input.page}, ${input.locale}, ${JSON.stringify(input.content)}::jsonb, 1, now(), ${input.nickname})
    ON CONFLICT (page, locale) DO UPDATE
      SET draft = EXCLUDED.draft,
          version = sc.version + 1,
          updated_at = now(),
          updated_by = EXCLUDED.updated_by
      WHERE sc.version = ${input.version}
    RETURNING ${CONTENT_COLUMNS}
  `.execute(general);

  return result.rows[0] ?? null;
}

export async function publishDraft(input: {
  page: SitePage;
  locale: SiteLocale;
  version: number;
  nickname: string;
}): Promise<SiteContentRow | null> {
  const result = await sql<SiteContentRow>`
    UPDATE site_content
    SET published = draft,
        version = version + 1,
        updated_at = now(),
        updated_by = ${input.nickname}
    WHERE page = ${input.page}
      AND locale = ${input.locale}
      AND draft IS NOT NULL
      AND version = ${input.version}
    RETURNING ${CONTENT_COLUMNS}
  `.execute(general);

  return result.rows[0] ?? null;
}

export async function discardDraft(input: {
  page: SitePage;
  locale: SiteLocale;
  version: number;
  nickname: string;
}): Promise<SiteContentRow | null> {
  const result = await sql<SiteContentRow>`
    UPDATE site_content
    SET draft = NULL,
        version = version + 1,
        updated_at = now(),
        updated_by = ${input.nickname}
    WHERE page = ${input.page}
      AND locale = ${input.locale}
      AND version = ${input.version}
    RETURNING ${CONTENT_COLUMNS}
  `.execute(general);

  return result.rows[0] ?? null;
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
