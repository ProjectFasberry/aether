import dayjs from 'dayjs';
import { getNats, natsLogger } from "#/shared/nats/client"
import { SUBJECTS } from "#/shared/nats/subjects"
import * as z from "zod/v4"
import { logErrorMsg } from "#/utils/config/log-utils";
import { general } from '#/shared/database/general-db';
import { safeJsonParse } from '#/utils/config/transforms';
import type { Msg } from '@nats-io/nats-core';
import { logger } from '#/utils/config/logger';

const userJoinSchema = z.object({
  date: z.string(),
  nickname: z.string(),
  event: z.enum(["join", "quit"])
})

function pushToReferral(
  { nickname }: { nickname: string }
) {
  const nc = getNats()

  const payload = new TextEncoder().encode(nickname)
  nc.publish(SUBJECTS.USERS.REWARD_CHECK, payload)
}

async function joinEvents(
  { nickname, date }: Omit<z.infer<typeof userJoinSchema>, "event">
) {
  pushToReferral({ nickname });

  const query = await general
    .insertInto("activity_users")
    .values({
      event: new Date().toISOString(),
      nickname,
      type: "join"
    })
    .executeTakeFirst()

  if (Number(query.numInsertedOrUpdatedRows)) {
    console.log("updated", query.insertId)
  }
}

async function quitEvents(
  { nickname, date }: Omit<z.infer<typeof userJoinSchema>, "event">
) {
  const query = await general
    .insertInto("activity_users")
    .values({
      event: new Date().toISOString(),
      nickname,
      type: "quit"
    })
    .executeTakeFirst()

  if (!query.numInsertedOrUpdatedRows) {
    logger.warn(`Activity for ${nickname} is not created`)
  }
}

async function handlePlayerJoin(msg: Msg) {
  const str = new TextDecoder().decode(msg.data);

  const result = safeJsonParse<z.infer<typeof userJoinSchema>>(str)
  if (!result.ok) return;

  const payload = result.value

  if (!userJoinSchema.shape.event.options.includes(payload.event)) {
    return;
  }

  const { success, data } = userJoinSchema.safeParse(payload)
  if (!success) return;

  try {
    natsLogger.log(`${data.nickname} ${data.event}`, dayjs().format("HH:mm:ss YYYY-MM-DD"))

    switch (data.event) {
      case "join":
        joinEvents(data);
        break;
      case "quit":
        quitEvents(data)
        break;
    }
  } catch (e) {
    logErrorMsg(e)
  }
}

export const subscribePlayerJoin = (subject: string) => {
  const nc = getNats()

  const subscription = nc.subscribe(subject, {
    callback: (e, msg) => {
      if (e) return logErrorMsg(e)

      void handlePlayerJoin(msg)
    }
  })

  return subscription
}