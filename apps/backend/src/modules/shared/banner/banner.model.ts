import { general } from "#/shared/database/general-db";
import { metaSchema } from "#/shared/schemas";
import * as z from "zod/v4";

export async function bannerExists(nickname: string | null) {
  if (!nickname) return false;

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

export const bannerSoloSchema = metaSchema.pick({ asc: true })

export const bannerSchema = z.object({
  id: z.coerce.number()
})