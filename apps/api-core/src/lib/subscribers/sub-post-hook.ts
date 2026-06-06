import { nats } from "#/shared/nats/client";
import { SUBJECTS } from "#/shared/nats/subjects";
import type { NatsConnection } from "@nats-io/nats-core";

// async function sendLogs(subject: string, message: string) {
//   try {
//     const bot = {}
//     const chats = getChats();
//     const text = format`${bold(subject)} ${message}`

//     for (const chat_id of chats) {
//       bot.api.sendMessage({ chat_id, text })
//     }
//   } catch (e) {
//     console.error(e)
//   }
// }

const A_SUBJECTS = [
  SUBJECTS.EVENTS.AUTHORIZATION.LOGIN,
  SUBJECTS.EVENTS.AUTHORIZATION.REGISTER
] as string[]

export const subscribePostHook = (nc: NatsConnection, subject: string) => {
  return nc.subscribe(subject, {
    callback: (err, msg) => {
      if (err) {
        nats.logger.error(err)
        return;
      }

      const subject = msg.subject;
      const decoder = new TextDecoder()
      const message = decoder.decode(msg.data)

      if (A_SUBJECTS.includes(subject)) {
        // sendLogs(subject, message)
      }
    }
  })
}
