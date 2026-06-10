import { isProduction } from "../env";
import { redis } from "./client";
import { SUBSCRIBERS } from "./subscribers";

export async function psubscribe() {
  const rsClient = redis.getBridgeInstance()
  await rsClient.psubscribe('__keyevent@0__:expired');

  const psubcribeLogger = redis.logger.withTag("psubscribe");

  SUBSCRIBERS.forEach((subscriber) => {
    psubcribeLogger.success(`Subscribed to "${subscriber.key}"`)
  })

  rsClient.on('pmessage', (pattern, channel, msg) => {
    if (!msg) return;

    if (!isProduction) {
     psubcribeLogger.log(pattern, channel, msg)
    }

    for (const subscriber of SUBSCRIBERS) {
      if (msg.startsWith(subscriber.key)) {
        try {
          subscriber.cb(msg);
        } catch (err) {
          psubcribeLogger.error(`Error in subscriber for key ${subscriber.key}:`, err);
        }
      }
    }
  });
}
