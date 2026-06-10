import Elysia, { type Static, t } from "elysia";
import { defineOptionalUser } from "#/lib/define";
import { withData } from "#/shared/schemas";
import { bannerExists } from "../../banner/banner.model";
import { libertybans } from "#/shared/database/libertybans-db";
import { urlsService } from "#/shared/constants/urls";
import { ipPlugin } from "#/lib/plugins/index";
import { getOption } from "#/shared/constants/options";
import { buildRouteSummary } from "#/utils";
import { DateTime } from "#/helpers/typebox";

function getWhitelist(ip: string) {
  const whitelist = urlsService.getWhitelistIpList()
  return whitelist.includes(ip);
}

export const banSchema = t.Object({
  created_at: DateTime,
  nickname: t.String(),
  reason: t.Nullable(t.String())
})

export async function getBan(nickname: string) {
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

  return query
}

const appOptionsSchema = t.Object({
  flags: t.Object({
    isBanner: t.Boolean(),
    isBanned: t.Boolean(),
    isPof: t.Boolean(),
    isAuthed: t.Boolean(),
    isWhitelisted: t.Boolean(),
  }),
  state: t.Object({
    stage: t.UnionEnum(["staging", "prod"])
  })
});

type AppOptionsPayload = Static<typeof appOptionsSchema>;

async function getPofStatus(): Promise<boolean> {
  const isEnabled = await getOption("botCheckEnabled")
  return isEnabled
}

export const appOptionsList = new Elysia()
  .use(defineOptionalUser())
  .use(ipPlugin())
  .get("/options", async ({ nickname, ip }) => {
    const [isBanner, isBanned, isPof] = await Promise.all([
      nickname ? bannerExists(nickname) : false,
      nickname ? getBan(nickname) : null,
      getPofStatus()
    ])

    const isWl = getWhitelist(ip)

    const data: AppOptionsPayload = {
      flags: {
        isBanner,
        isBanned: Boolean(isBanned),
        isPof,
        isAuthed: Boolean(nickname),
        isWhitelisted: isWl
      },
      state: {
        stage: Bun.env.STAGE as AppOptionsPayload["state"]["stage"]
      }
    }

    return { data }
  }, {
    response: {
      200: withData(
        appOptionsSchema
      )
    },
    detail: {
      summary: buildRouteSummary("Get app options")
    }
  })
