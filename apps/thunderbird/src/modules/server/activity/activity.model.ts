import { general } from "#/shared/database/general-db";
import { natsService } from "#/shared/nats/client";
import { SUBJECTS } from "#/shared/nats/subjects";
import dayjs from "dayjs";
import { sql } from "kysely";
import type { PlayerActivityPayload } from "./activity-now.route";
import { getEnv } from "#/shared/env";
import { serverStatusService } from "../status/index.model";
import { invariant } from "#/utils";

type PlayerStatus = {
  nickname: string;
  type: "online" | "offline"
}

async function getUserLastVisitTime(nickname: string) {
  const query = await general
    .selectFrom('activity_users')
    .select([
      'activity_users.event',
      sql<string>`(
        SELECT q.event
        FROM activity_users q
        WHERE q.nickname = activity_users.nickname
          AND q.type = 'quit'
          AND q.event > activity_users.event
        ORDER BY q.event ASC
        LIMIT 1
      )`.as('quit_event'),
    ])
    .where('activity_users.nickname', '=', nickname)
    .where('activity_users.type', '=', 'join')
    .orderBy('activity_users.event', 'desc')
    .limit(1)
    .executeTakeFirst();

  const data = {
    quited: query?.quit_event ? dayjs(query.quit_event).toDate() : null,
    joined: query?.event ? dayjs(query.event).toDate() : null
  }

  return data
}

export async function getPlayerStatus(nickname: string): Promise<PlayerActivityPayload> {
  const nc = natsService.getInstance()

  try {
    const playerStatus = await serverStatusService.getPlayerStatusGlobal({
      nickname,
      panelPassword: getEnv().PANEL_PASSWORD,
      panelUser: getEnv().PANEL_USER,
    })

    if (playerStatus) {
      const { currentServer } = playerStatus

      return { type: "online", nickname, server: currentServer, issued_date: dayjs().toDate() }
    } else {
      const payload = {
        event: SUBJECTS.SERVER.EVENTS.USER.CHECK_ONLINE,
        nickname
      }

      const res = await nc.request(SUBJECTS.SERVER.EVENTS.USER.EVENT, JSON.stringify(payload), { timeout: 1000 })

      if (res) {
        const { type } = res.json<PlayerStatus>();
        invariant(type, `Type "${type}" is not defined`)

        const lastVisitTime = await getUserLastVisitTime(nickname);

        return { type: "offline", nickname, issued_date: dayjs(lastVisitTime["quited"]).toDate() }
      } else {
        return { nickname, issued_date: null, type: "offline" }
      }
    }
  } catch (e) {
    return { nickname, type: "offline", issued_date: null }
  }
}
