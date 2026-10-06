import Elysia, { type Static, t } from "elysia";
import { bannerSchema, bannerSingleSchema } from "./banner.model";
import { general } from "#/shared/database/general-db";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";

type Banner = Static<typeof bannerSingleSchema>;

const baseQuery = general
  .selectFrom("banners")
  .select(["id", "title", "description", "href_title", "href_value"]);

async function getLatestBanner(): Promise<Banner | null> {
  const query = await baseQuery.orderBy("created_at", "desc").executeTakeFirst();

  if (!query) return null;

  const { href_title, href_value, ...base } = query;

  return {
    ...base,
    href: {
      title: href_title,
      value: href_value,
    },
  };
}

async function getBanner(id: number): Promise<Banner | null> {
  const query = await baseQuery.where("id", "=", id).executeTakeFirst();

  if (!query) return null;

  const { href_title, href_value, ...base } = query;

  return {
    ...base,
    href: {
      title: href_title,
      value: href_value,
    },
  };
}

export const bannerSolo = new Elysia()
  .get("/:id", async ({ params: { id } }) => {
    const data = await getBanner(id);
    return { data };
  }, {
    params: bannerSchema,
    response: {
      200: withData(t.Nullable(bannerSingleSchema)),
    },
    detail: {
      summary: buildRouteSummary("Get banner by id"),
    },
  });

export const bannerLatest = new Elysia()
  .get("/latest", async (ctx) => {
    const data = await getLatestBanner();
    return { data };
  }, {
    response: {
      200: withData(t.Nullable(bannerSingleSchema)),
    },
    detail: {
      summary: buildRouteSummary("Get latest banner"),
    },
  });
