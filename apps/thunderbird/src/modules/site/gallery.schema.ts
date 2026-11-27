import { t } from "elysia";
import { Value } from "@sinclair/typebox/value";

export const GALLERY_TAGS = ["nature", "cities", "events", "builds"] as const;
export type GalleryTag = (typeof GALLERY_TAGS)[number];

export const galleryTagSchema = t.UnionEnum(GALLERY_TAGS);

/** One screenshot in the landing gallery. */
const galleryItemSchema = t.Object({
  /** Stable id and the image name in the `static/community` folder. */
  key: t.String({ minLength: 1, maxLength: 128 }),
  tag: galleryTagSchema,
  /** Editor-provided caption; seeded items keep a translation key instead. */
  title: t.Optional(t.String({ maxLength: 200 })),
  titleKey: t.Optional(t.String({ maxLength: 128 })),
  /** Image path inside the `static` bucket, when it differs from `key`. */
  image: t.Optional(t.String({ minLength: 1, maxLength: 512 })),
  thumb: t.Optional(t.String({ minLength: 1, maxLength: 512 })),
  width: t.Optional(t.Number()),
  height: t.Optional(t.Number()),
  createdAt: t.Optional(t.String()),
});

export type GalleryItemInput = typeof galleryItemSchema.static;

/**
 * The gallery starts as a seed so the page never depends on a hand-made row.
 * Once `site_content` has a `gallery` page, its items win.
 */
export const GALLERY_SEED: GalleryItemInput[] = [
  { key: "moon", tag: "nature", titleKey: "gallery.items.moon" },
  { key: "sunset", tag: "nature", titleKey: "gallery.items.sunset" },
  { key: "market", tag: "cities", titleKey: "gallery.items.market" },
  { key: "duck", tag: "builds", titleKey: "gallery.items.duck" },
  { key: "dragon_dead", tag: "events", titleKey: "gallery.items.dragon" },
  { key: "hills", tag: "nature", titleKey: "gallery.items.hills" },
  { key: "market_seller", tag: "cities", titleKey: "gallery.items.seller" },
  { key: "offenburg", tag: "cities", titleKey: "gallery.items.offenburg" },
  { key: "night", tag: "cities", titleKey: "gallery.items.night" },
  { key: "water_sand", tag: "nature", titleKey: "gallery.items.shore" },
  { key: "early_sunset", tag: "nature", titleKey: "gallery.items.early-sunset" },
];

export const galleryPageSchema = t.Object({
  items: t.Optional(t.Array(galleryItemSchema, { maxItems: 500 })),
});

/** Keep a malformed `site_content` document from breaking the public page. */
export function asGalleryItems(value: unknown): GalleryItemInput[] | null {
  if (!Value.Check(galleryPageSchema, value)) return null;

  return value.items?.length ? value.items : null;
}
