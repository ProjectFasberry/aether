import { general } from "#/shared/database/general-db";
import { metaSchema } from "#/shared/schemas";
import { t } from "elysia";

export async function bannerExists(nickname: string) {
  const result = await general
    .selectFrom("banners as b")
    .select((eb) => [
      eb
        .exists(
          eb
            .selectFrom("banners_views as bv")
            .select("bv.banner_id")
            .whereRef("bv.banner_id", "=", "b.id")
            .where("bv.nickname", "=", nickname)
        )
        .as("viewed"),
    ])
    .orderBy("b.created_at", "desc")
    .limit(1)
    .executeTakeFirst();

  if (!result) return false;

  return !result.viewed;
}

export const bannerSoloSchema = t.Pick(metaSchema, ["asc"])

export const bannerSchema = t.Object({
  id: t.Number()
})