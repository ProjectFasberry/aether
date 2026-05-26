import { loginQR } from "#/modules/auth/login.model";
import { redisLogger } from "#/utils/config/logger";
import { isProduction } from "../env";
import { nats } from "../nats/client";
import { redis } from "./client";

const SUBSCRIBERS: { key: string, cb: (msg: string) => void }[] = [
  {
    key: "auth:qr:",
    cb: (msg: string) => {
      const nsClient = nats.get();
      const [, , qrToken] = msg.split(':');
      if (!qrToken) return;

      const subject = loginQR.createQRSubject("expired", qrToken)
      nsClient.publish(subject, JSON.stringify({ data: qrToken }));
    },
  }
]

export async function psubscribe() {
  const rsClient = redis.getBridge()
  await rsClient.psubscribe('__keyevent@0__:expired');

  SUBSCRIBERS.forEach((subscriber) => {
    redisLogger.withTag("psubscribe").success(`${subscriber.key} inited`)
  })

  rsClient.on('pmessage', (pattern, channel, msg) => {
    if (!msg) return;

    if (!isProduction) {
      redisLogger.withTag("psubscribe").log(pattern, channel, msg)
    }

    for (const subscriber of SUBSCRIBERS) {
      if (msg.startsWith(subscriber.key)) {
        try {
          subscriber.cb(msg);
        } catch (err) {
          redisLogger.withTag("psubscribe").error(`Error in subscriber for key ${subscriber.key}:`, err);
        }
      }
    }
  });
}
