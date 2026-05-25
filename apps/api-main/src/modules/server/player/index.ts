import Elysia from "elysia";
import { playerLocation } from "#/modules/server/location";
import { playerStats } from "./player-stats.route";
import { player } from "#/modules/user/player.route";
import { playerSkills } from "./player-skils.route";
import { playerActivity } from "../activity";
import { playerAchievements } from "../achievements";
import { seemsPlayers } from "#/modules/user/seems-players.route";
import { balance } from "#/modules/user/balance.route";
import { playerSocials } from "#/modules/user/socials.route";

export const playerGroup = new Elysia()
  .group("", app => app
    .use(player)
    .use(playerStats)
    .use(playerSkills)
    .use(playerActivity)
    .use(playerAchievements)
    .use(playerLocation)
    .use(seemsPlayers)
    .use(balance)
    .use(playerSocials)
  )