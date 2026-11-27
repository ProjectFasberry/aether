import { t, type Static } from "elysia";
import { general } from "#/shared/database/general-db";

/**
 * FAQ entries live in the database so the panel can add, edit and delete them
 * without a deploy. `scope` maps an entry to the page that renders it.
 */
export const FAQ_SCOPES = ["home", "support"] as const;
export const faqScopeSchema = t.UnionEnum(FAQ_SCOPES);
export const faqScopeFilterSchema = t.Union(FAQ_SCOPES.map((scope) => t.Literal(scope)));

export const faqLocaleSchema = t.UnionEnum(["ru", "en"]);

export const faqItemSchema = t.Object({
  id: t.String(),
  scope: t.String(),
  locale: t.String(),
  question: t.String(),
  answer: t.String(),
  linkLabel: t.Nullable(t.String()),
  linkHref: t.Nullable(t.String()),
  position: t.Number(),
  published: t.Boolean(),
});

export type FaqItemPayload = Static<typeof faqItemSchema>;

export const faqCreateSchema = t.Object({
  scope: faqScopeSchema,
  locale: faqLocaleSchema,
  question: t.String({ minLength: 1, maxLength: 500 }),
  answer: t.String({ minLength: 1, maxLength: 4000 }),
  linkLabel: t.Optional(t.Nullable(t.String({ maxLength: 200 }))),
  linkHref: t.Optional(t.Nullable(t.String({ maxLength: 512 }))),
  published: t.Optional(t.Boolean()),
});

export const faqUpdateSchema = t.Partial(faqCreateSchema);

type FaqRow = {
  id: string;
  scope: string;
  locale: string;
  question: string;
  answer: string;
  link_label: string | null;
  link_href: string | null;
  position: number;
  published: boolean;
};

const toPayload = (row: FaqRow): FaqItemPayload => ({
  id: row.id,
  scope: row.scope,
  locale: row.locale,
  question: row.question,
  answer: row.answer,
  linkLabel: row.link_label,
  linkHref: row.link_href,
  position: Number(row.position),
  published: row.published,
});

const ordered = (rows: FaqRow[]) => rows.map(toPayload);

export async function getPublishedFaq(scope: string, locale: string): Promise<FaqItemPayload[]> {
  const rows = await general
    .selectFrom("faq_items")
    .selectAll()
    .where("scope", "=", scope)
    .where("locale", "=", locale)
    .where("published", "=", true)
    .orderBy("position", "asc")
    .orderBy("created_at", "asc")
    .execute();

  return ordered(rows);
}

export async function listFaq(scope?: string, locale?: string): Promise<FaqItemPayload[]> {
  let query = general.selectFrom("faq_items").selectAll();

  if (scope) query = query.where("scope", "=", scope);
  if (locale) query = query.where("locale", "=", locale);

  const rows = await query
    .orderBy("scope", "asc")
    .orderBy("locale", "asc")
    .orderBy("position", "asc")
    .orderBy("created_at", "asc")
    .execute();

  return ordered(rows);
}

async function nextPosition(scope: string, locale: string): Promise<number> {
  const result = await general
    .selectFrom("faq_items")
    .select((eb) => eb.fn.max("position").as("max"))
    .where("scope", "=", scope)
    .where("locale", "=", locale)
    .executeTakeFirst();

  return Number(result?.max ?? 0) + 1;
}

export async function createFaq(input: Static<typeof faqCreateSchema>): Promise<FaqItemPayload> {
  const row = await general
    .insertInto("faq_items")
    .values({
      scope: input.scope,
      locale: input.locale,
      question: input.question,
      answer: input.answer,
      link_label: input.linkLabel ?? null,
      link_href: input.linkHref ?? null,
      published: input.published ?? true,
      position: await nextPosition(input.scope, input.locale),
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return toPayload(row);
}

export async function updateFaq(id: string, input: Static<typeof faqUpdateSchema>): Promise<FaqItemPayload | null> {
  const patch: Record<string, unknown> = { updated_at: new Date() };

  if (input.scope !== undefined) patch.scope = input.scope;
  if (input.locale !== undefined) patch.locale = input.locale;
  if (input.question !== undefined) patch.question = input.question;
  if (input.answer !== undefined) patch.answer = input.answer;
  if (input.linkLabel !== undefined) patch.link_label = input.linkLabel;
  if (input.linkHref !== undefined) patch.link_href = input.linkHref;
  if (input.published !== undefined) patch.published = input.published;

  const row = await general
    .updateTable("faq_items")
    .set(patch)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();

  return row ? toPayload(row) : null;
}

export async function deleteFaq(id: string): Promise<boolean> {
  const result = await general
    .deleteFrom("faq_items")
    .where("id", "=", id)
    .executeTakeFirst();

  return Number(result?.numDeletedRows ?? 0) > 0;
}
