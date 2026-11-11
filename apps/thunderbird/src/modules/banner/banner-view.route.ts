import Elysia, { t } from "elysia";
import { defineRequiredUser } from "#/lib/define";
import { general } from "#/shared/database/general-db";
import { bannerSchema } from "./banner.model";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";

/**
 * One view per banner and nickname, so a page refresh or a bot loop cannot grow
 * the table. On a duplicate the stored row is returned to keep the response
 * shape stable.
 */
async function viewBanner(id: number, nickname: string) {
  const inserted = await general
    .insertInto("banners_views")
    .values({
      banner_id: id,
      nickname,
    })
    .onConflict((oc) => oc.columns(["banner_id", "nickname"]).doNothing())
    .returningAll()
    .executeTakeFirst();

  if (inserted) return inserted;

  const existing = await general
    .selectFrom("banners_views")
    .selectAll()
    .where("banner_id", "=", id)
    .where("nickname", "=", nickname)
    .executeTakeFirst();

  return existing ?? { id: 0, banner_id: id, nickname };
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
