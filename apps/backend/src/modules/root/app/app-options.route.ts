import Elysia, { t } from "elysia";
import { defineOptionalUser } from "#/lib/middlewares/define";
import { withData } from "#/shared/schemas";
import { bannerExists } from "../../shared/banner/banner.model";
import type { AppOptionsPayload } from "@repo/shared/types/entities/other";
import { libertybans } from "#/shared/database/libertybans-db";
import { getWhitelistIpList } from "#/shared/constants/urls";
import { ipPlugin } from "#/lib/plugins/ip";

function getWhitelist(ip: string) {
  const whitelist = getWhitelistIpList()
  return whitelist.includes(ip);
}

export async function getBan(nickname: string | null) {
  if (!nickname) return null;

  const query = await libertybans
    .selectFrom("libertybans_victims")
    .innerJoin("libertybans_names", "libertybans_names.uuid", "libertybans_victims.uuid")
    .innerJoin("libertybans_bans", "libertybans_bans.victim", "libertybans_bans.id")
    .innerJoin("libertybans_punishments", "libertybans_punishments.id", "libertybans_bans.id")
    .select([
      "libertybans_punishments.start as created_at",
      "libertybans_names.name as nickname",
      "libertybans_punishments.reason"
    ])
    .where("libertybans_names.lower_name", "=", nickname.toLowerCase())
    .executeTakeFirst()

  return query ?? null
}

export const appOptionsList = new Elysia()
  .use(defineOptionalUser())
  .use(ipPlugin())
  .get("/options", async ({ nickname, ip }) => {
    const bannerIsExists = await bannerExists(nickname)
    const isBanned = await getBan(nickname);
    const isWl = getWhitelist(ip)

    const data: AppOptionsPayload = {
      bannerIsExists,
      isBanned: Boolean(isBanned),
      isWl,
      isAuth: Boolean(nickname)
    }

    return { data }
  }, {
    response: {
      200: withData(
        t.Object({
          bannerIsExists: t.Boolean(),
          isBanned: t.Boolean(),
          isWl: t.Boolean(),
          isAuth: t.Boolean()
        })
      )
    }
  })