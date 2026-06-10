import Elysia, { t } from "elysia";
import { defineRequiredUser } from "#/lib/define";
import { general } from "#/shared/database/general-db";
import { bannerSchema } from "./banner.model";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";

async function viewBanner(id: number, nickname: string) {
  const query = await general
    .insertInto("banners_views")
    .values({
      banner_id: id,
      nickname,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return query;
}

const bannerViewPayload = t.Object({
  banner_id: t.Nullable(t.Number()),
  id: t.Number(),
  nickname: t.String(),
});

export const bannerView = new Elysia()
  .use(defineRequiredUser())
  .post("/view/:id", async ({ nickname, params: { id } }) => {
    const data = await viewBanner(id, nickname);
    return { data };
  }, {
    params: bannerSchema,
    response: {
      200: withData(bannerViewPayload),
    },
    detail: {
      summary: buildRouteSummary("View banner"),
    },
  });
