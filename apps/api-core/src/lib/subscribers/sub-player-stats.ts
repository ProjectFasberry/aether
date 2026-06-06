import { bisquite } from "#/shared/database/bisquite-db"
import { reputation } from "#/shared/database/reputation-db"
import { logErrorMsg } from "#/utils/config/log-utils";
import type { Msg, NatsConnection } from "@nats-io/nats-core"

type PlayerStats = {
  charism: number
  belkoin: number
  reputation: number,
  meta: string | null,
  displayName: string | null,
  totalPlaytime: number
}

async function getPlayerStats(nickname: string): Promise<PlayerStats> {
  let initial: PlayerStats = {
    charism: 0, meta: null, belkoin: 0, reputation: 0, displayName: null, totalPlaytime: 0
  }

  const main = await bisquite
    .selectFrom("cmi_users")
    .leftJoin("playerpoints_username_cache", "cmi_users.username", "playerpoints_username_cache.username")
    .leftJoin("playerpoints_points", "playerpoints_points.uuid", "playerpoints_username_cache.uuid")
    .select([
      "Balance",
      "UserMeta",
      "playerpoints_points.points",
      "cmi_users.player_uuid",
      "cmi_users.TotalPlayTime",
      "cmi_users.DisplayName"
    ])
    .where("cmi_users.username", "=", nickname)
    .executeTakeFirst()

  if (!main) {
    return initial
  }

  const result = await reputation
    .selectFrom("reputation")
    .select("reputation")
    .where("reputation.uuid", "=", main.player_uuid)
    .executeTakeFirst()

  initial = {
    charism: main.Balance ? Number(main.Balance.toFixed(2)) : 0,
    meta: main.UserMeta,
    belkoin: main.points ? Number(main.points.toFixed(2)) : 0,
    reputation: result?.reputation ? result.reputation : 0,
    displayName: main.DisplayName,
    totalPlaytime: main.TotalPlayTime ?? 0
  }

  return initial
}

async function handlePlayerStats(msg: Msg) {
  const subject = msg.subject
  const nickname = subject.split(".")[3]

  if (!nickname) {
    const payload = JSON.stringify({ error: "Invalid nickname" });

    return msg.respond(payload)
  }

  try {
    const stats = await getPlayerStats(nickname)

    return msg.respond(JSON.stringify(stats))
  } catch (e) {
    logErrorMsg(e)
  }
}

export const subscribePlayerStats = (nc: NatsConnection, subject: string) => {
  const subscription = nc.subscribe(subject, {
    callback: (e, msg) => {
      if (e) return logErrorMsg(e)

      void handlePlayerStats(msg)
    }
  })

  return subscription
}