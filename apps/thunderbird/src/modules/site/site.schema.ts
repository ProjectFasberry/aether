import { t } from "elysia";
import { galleryPageSchema } from "./gallery.schema";

/**
 * Editable landing content: schemas and page registry.
 *
 * Kept free of database imports so the same definitions can be unit-tested and
 * reused by anything that validates a draft before it reaches the API.
 */

export const SITE_LOCALES = ["ru", "en"] as const;
export type SiteLocale = (typeof SITE_LOCALES)[number];
export const siteLocaleSchema = t.UnionEnum(SITE_LOCALES);

const imageKeySchema = t.String({ minLength: 1, maxLength: 512 });

const carouselItemSchema = t.Object({
  /** Path inside the `static` bucket, e.g. `images/offenburg-1.webp`. */
  image: imageKeySchema,
  alt: t.Optional(t.String({ maxLength: 300 })),
});

const serverFeatureSchema = t.Object({
  icon: imageKeySchema,
  title: t.String({ minLength: 1, maxLength: 128 }),
  description: t.String({ minLength: 1, maxLength: 1024 }),
});

const serverItemSchema = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 128 })),
  tagline: t.Optional(t.String({ maxLength: 300 })),
  description: t.Optional(t.String({ maxLength: 4096 })),
  /** Path inside the `static` bucket. */
  image: t.Optional(imageKeySchema),
  icon: t.Optional(imageKeySchema),
  features: t.Optional(t.Array(serverFeatureSchema, { maxItems: 12 })),
});

const sectionSchema = t.Object({
  id: t.String({ minLength: 1, maxLength: 64 }),
  title: t.String({ minLength: 1, maxLength: 200 }),
  body: t.String({ maxLength: 4096 }),
  /** Kept in the document but skipped by the public page. */
  hidden: t.Optional(t.Boolean()),
});

/** Extra text sections every page can carry, ordered by the array. */
const sectionsSchema = t.Optional(t.Array(sectionSchema, { maxItems: 20 }));

/** Overrides for the built-in sections, keyed by their stable id. */
const blockSchema = t.Object({
  title: t.Optional(t.String({ maxLength: 200 })),
  description: t.Optional(t.String({ maxLength: 2048 })),
  hidden: t.Optional(t.Boolean()),
});

const blocksSchema = t.Optional(t.Record(t.String({ minLength: 1, maxLength: 64 }), blockSchema));

/** Page registry: keys are the public `page` slug, values validate the document. */
export const SITE_PAGES = {
  home: t.Object({
    carousel: t.Optional(t.Array(carouselItemSchema, { maxItems: 20 })),
    sections: sectionsSchema,
    blocks: blocksSchema,
  }),
  servers: t.Object({
    /** Shared page intro above the per-server sections. */
    title: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
    description: t.Optional(t.String({ maxLength: 1024 })),
    items: t.Optional(t.Record(t.String({ minLength: 1, maxLength: 64 }), serverItemSchema)),
    sections: sectionsSchema,
    blocks: blocksSchema,
  }),
  /** Pages whose editable part is just the custom sections for now. */
  start: t.Object({ sections: sectionsSchema, blocks: blocksSchema }),
  support: t.Object({ sections: sectionsSchema, blocks: blocksSchema }),
  modpack: t.Object({ sections: sectionsSchema, blocks: blocksSchema }),
  gallery: galleryPageSchema,
} as const;

export type SitePage = keyof typeof SITE_PAGES;
export const SITE_PAGE_NAMES = Object.keys(SITE_PAGES) as SitePage[];

export function isSitePage(value: string): value is SitePage {
  return Object.hasOwn(SITE_PAGES, value);
}

export type SiteContentPayload = {
  page: SitePage;
  locale: SiteLocale;
  content: unknown;
  version: number;
  updatedAt: string | null;
};
