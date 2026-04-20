import { general } from "#/shared/database/general-db";
import { buildUpdates } from "#/utils/config/transforms";
import type { Banners } from "@repo/shared/types/db/general-database-types";
import type { Selectable } from "kysely";
import * as z from "zod/v4";

export const createBannerSchema = z.object({
  title: z.string(),
  description: z.string().transform((v) => v.trim() || undefined).optional(),
  href: z.object({
    title: z.string(),
    value: z.url()
  })
})

export const bannerEditSchema = z.array(
  z.object({
    field: z.enum(["title", "description"]),
    value: z.union([z.string()]),
  }),
);

export const banner = {
  async create({ title, description, href }: z.infer<typeof createBannerSchema>) {
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

    const { href_title, href_value, ...base } = query

    return {
      ...base,
      href: {
        title: href_title,
        value: href_value
      }
    };
  },
  async edit(id: number, values: z.infer<typeof bannerEditSchema>) {
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
  async delete(id: number) {
    const query = await general
      .deleteFrom("banners")
      .where("id", "=", id)
      .returning(["id"])
      .executeTakeFirst()
  
    return query;
  }
} as const;