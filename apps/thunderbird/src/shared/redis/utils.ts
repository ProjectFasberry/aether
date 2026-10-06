import { isProduction } from "../env";
import { redisService } from "./client";
import { SUBSCRIBERS } from "./subscribers";

export async function psubscribe() {
  const rsClient = redisService.getBridgeInstance()
  await rsClient.psubscribe('__keyevent@0__:expired');

  const psubcribeLogger = redisService.logger.child({ name: "psubscribe" });

  SUBSCRIBERS.forEach((subscriber) => {
    psubcribeLogger.info(`Subscribed to "${subscriber.key}"`)
  })

  rsClient.on('pmessage', (pattern, channel, msg) => {
    if (!msg) return;

    if (!isProduction) {
     psubcribeLogger.info(pattern, channel, msg)
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
