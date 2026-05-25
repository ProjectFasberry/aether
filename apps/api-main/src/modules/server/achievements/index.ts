import Elysia from "elysia"
import { achievementsByPlayer } from "./achievements-data.route"
import { achievementsMeta } from "./achievements-meta.route"

export const playerAchievements = new Elysia()
  .group("/achievements", app => app
    .use(achievementsByPlayer)
    .use(achievementsMeta)
  )