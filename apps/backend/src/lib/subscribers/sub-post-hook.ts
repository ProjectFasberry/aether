import { getNats } from "#/shared/nats/client";
import { SUBJECTS } from "#/shared/nats/subjects";
import { natsLogger } from "#/utils/config/logger";

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

export const subscribePostHook = (subject: string) => {
  const nc = getNats()

  return nc.subscribe(subject, {
    callback: (err, msg) => {
      if (err) {
        natsLogger.error(err)
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