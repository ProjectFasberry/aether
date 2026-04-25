import Elysia, { t } from "elysia";
import { bannerSchema } from "./banner.model";
import type { BannerPayload } from "@repo/shared/types/entities/banner";
import { general } from "#/shared/database/general-db";
import { withData } from "#/shared/schemas";
import { bannerPayload } from "./banner-list.route";

const baseQuery = general
  .selectFrom("banners")
  .select(["id", "title", "description", "href_title", "href_value"])

async function getLatestBanner(): Promise<BannerPayload | null> {
  const query = await baseQuery
    .orderBy("created_at", "desc")
    .executeTakeFirst()

  if (!query) return null;

  const { href_title, href_value, ...base } = query

  return {
    ...base,
    href: {
      title: href_title,
      value: href_value
    }
  }
}

async function getBanner(
  id: number
): Promise<BannerPayload | null> {
  const query = await baseQuery
    .where("id", "=", id)
    .executeTakeFirst()

  if (!query) return null;

  const { href_title, href_value, ...base } = query

  return {
    ...base,
    href: {
      title: href_title,
      value: href_value
    }
  }
}

export const bannerSolo = new Elysia()
  .get("/:id", async ({ params: { id } }) => {
    const data = await getBanner(id);
    return { data }
  }, {
    params: bannerSchema,
    response: {
      200: withData(
        t.Nullable(bannerPayload)
      )
    }
  })

export const bannerLatest = new Elysia()
  .get("/latest", async (ctx) => {
    const data = await getLatestBanner();
    return { data }
  }, {
    response: {
      200: withData(
        t.Nullable(bannerPayload)
      )
    }
  })