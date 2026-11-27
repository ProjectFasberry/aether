import Elysia, { t } from "elysia";

import { buildRouteSummary } from "#/lib/routes";
import { getEnv } from "#/shared/env";
import { getSiteContent, siteLocaleSchema, type SiteLocale } from "./site.model";
import {
  asGalleryItems,
  GALLERY_SEED,
  galleryTagFilterSchema,
  galleryTagSchema,
  type GalleryItemInput,
  type GalleryTag,
} from "./gallery.schema";

const galleryQuerySchema = t.Object({
  locale: t.Optional(siteLocaleSchema),
  tag: t.Optional(galleryTagFilterSchema),
  limit: t.Optional(t.Number({ minimum: 1, maximum: 48 })),
  /** Offset cursor; the gallery is a curated list, not a live feed. */
  cursor: t.Optional(t.String({ pattern: "^\\d+$" })),
});

const galleryItemPayload = t.Object({
  id: t.String(),
  tag: galleryTagSchema,
  title: t.Nullable(t.String()),
  titleKey: t.Nullable(t.String()),
  src: t.String(),
  thumb: t.String(),
  width: t.Nullable(t.Number()),
  height: t.Nullable(t.Number()),
  createdAt: t.Nullable(t.String()),
});

const galleryMetaPayload = t.Object({
  total: t.Number(),
  hasNextPage: t.Boolean(),
  nextCursor: t.Nullable(t.String()),
  counts: t.Object({
    all: t.Number(),
    nature: t.Number(),
    cities: t.Number(),
    events: t.Number(),
    builds: t.Number(),
  }),
});

const communityUrl = (name: string) =>
  `${getEnv().VOLUME_URL}/static/community/${name}.webp`;

/** The image key is the file name unless the editor points at another file. */
const imageName = (item: GalleryItemInput, variant: "full" | "thumb") => {
  if (variant === "thumb") return item.thumb ?? item.image ?? item.key;
  return item.image ?? item.key;
};

function toPayload(item: GalleryItemInput) {
  const full = imageName(item, "full");

  return {
    id: item.key,
    tag: item.tag,
    title: item.title ?? null,
    titleKey: item.titleKey ?? null,
    src: communityUrl(full),
    thumb: communityUrl(imageName(item, "thumb")),
    width: item.width ?? null,
    height: item.height ?? null,
    createdAt: item.createdAt ?? null,
  };
}

async function publishedItems(locale: SiteLocale): Promise<GalleryItemInput[]> {
  const row = await getSiteContent("gallery", locale).catch(() => null);
  return asGalleryItems(row?.published) ?? GALLERY_SEED;
}

function countByTag(items: GalleryItemInput[]) {
  const counts: Record<"all" | GalleryTag, number> = {
    all: items.length,
    nature: 0,
    cities: 0,
    events: 0,
    builds: 0,
  };

  for (const item of items) counts[item.tag] += 1;

  return counts;
}

export const siteGallery = new Elysia()
  .get(
    "/gallery",
    async ({ query, set }) => {
      const locale: SiteLocale = query.locale ?? "ru";
      const limit = query.limit ?? 12;
      const offset = Math.min(Number(query.cursor ?? 0), Number.MAX_SAFE_INTEGER);

      const all = await publishedItems(locale);
      const filtered = query.tag ? all.filter((item) => item.tag === query.tag) : all;
      const page = filtered.slice(offset, offset + limit);
      const nextOffset = offset + page.length;

      // The list changes only when an editor publishes, so a short public cache
      // is enough and repeat scrolls stay cheap.
      set.headers["cache-control"] = "public, max-age=30, stale-while-revalidate=120";

      return {
        data: page.map(toPayload),
        meta: {
          total: filtered.length,
          hasNextPage: nextOffset < filtered.length,
          nextCursor: nextOffset < filtered.length ? String(nextOffset) : null,
          counts: countByTag(all),
        },
      };
    },
    {
      query: galleryQuerySchema,
      response: {
        200: t.Object({
          data: t.Array(galleryItemPayload),
          meta: galleryMetaPayload,
        }),
      },
      detail: {
        summary: buildRouteSummary("Get landing gallery"),
      },
    },
  );
