import { general } from "#/shared/database/general-db";
import { buildUpdates } from "#/utils/config/transforms";
import type { Banners } from "@repo/shared/types/db/general";
import { type Static, t } from "elysia";
import type { Selectable } from "kysely";

export const bannerSchema = t.Object({
  id: t.Number(),
  title: t.String(),
  description: t.Nullable(t.String()),
  created_at: t.String(),
  href_title: t.String(),
  href_value: t.String(),
})

export const createBannerSchema = t.Object({
  title: t.String(),
  description: t.Optional(
    t.Transform(t.String())
      .Decode((v) => v.trim() || undefined)
      .Encode((v) => v ?? '')
  ),
  href: t.Object({
    title: t.String(),
    value: t.String()
  })
})

export const editBannerSchema = t.Array(
  t.Object({
    field: t.UnionEnum(["title", "description"]),
    value: t.Union([t.String()]),
  }),
);

export const createBannerPayloadSchema = t.Composite([
  t.Pick(bannerSchema, ["id", "title", "created_at", "description"]),
  t.Pick(createBannerSchema, ["href"])
])

export const banner = {
  async create({
    title, description, href
  }: Static<typeof createBannerSchema>): Promise<Static<typeof createBannerPayloadSchema>> {
    const query = await general
      .insertInto("banners")
      .values({
        title,
        description,
        href_title: href.title,
        href_value: href.value
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    const { href_title, href_value, created_at, ...base } = query

    return {
      ...base,
      created_at: created_at.toString(),
      href: {
        title: href_title,
        value: href_value
      }
    };
  },
  async edit(id: number, values: Static<typeof editBannerSchema>) {
    const updates = buildUpdates<Selectable<Banners>>(values);
    const keys = values.map((o) => o.field);

    const query = await general
      .updateTable("banners")
      .set(updates)
      .where("id", "=", id)
      .returning(keys)
      .executeTakeFirstOrThrow();

    return query;
  },
  async delete(id: number): Promise<{ id: number } | null> {
    const query = await general
      .deleteFrom("banners")
      .where("id", "=", id)
      .returning(["id"])
      .executeTakeFirst()

    return query ?? null;
  }
} as const;
