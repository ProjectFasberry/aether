import Elysia, { t } from "elysia";
import { getPlayerAvatar } from "../server/skin/skin.model";
import { defineOptionalUser } from "#/lib/middlewares/define";
import type { Player } from "@repo/shared/types/entities/user";
import { withData } from "#/shared/schemas";
import { getDonate, getMain, getRate } from "./player.model";

const PlayerPayload = t.Object({
  nickname: t.String(),
  lower_case_nickname: t.String(),
  uuid: t.String(),
  group: t.String(),
  avatar: t.String(),
  meta: t.Object({
    reg_date: t.Union([t.String(), t.Date()]),
    login_date: t.Union([t.String(), t.Date()])
  }),
  rate: t.Object({
    count: t.Number(),
    isRated: t.Boolean()
  })
})

export const player = new Elysia()
  .use(defineOptionalUser())
  .model({
    "player": withData(PlayerPayload)
  })
  .get("/player/:nickname", async ({ status, nickname: initiator, params }) => {
    const recipient = params.nickname;

    const [main, group, avatar, rate] = await Promise.all([
      getMain({ recipient }),
      getDonate({ recipient }),
      getPlayerAvatar(recipient),
      getRate({ recipient, initiator }),
    ]);

    if (!main || !group || !avatar || !rate) {
      return status(404, { data: null });
    }

    const { meta, ...some } = main

    const data: Player = {
      ...some,
      group,
      avatar,
      meta,
      rate,
    };

    return { data }
  }, {
    response: {
      200: "player",
      404: t.Object({ data: t.Null() })
    }
  })