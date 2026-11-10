import { isProduction } from "../env";
import { redisService } from "./client";
import { SUBSCRIBERS } from "./subscribers";

export async function psubscribe() {
  const rsClient = redisService.getBridgeInstance()
  const psubcribeLogger = redisService.logger.child({ name: "psubscribe" });

  // Keyspace notifications are server-wide. Use the existing bridge client;
  // a dedicated connection would not add isolation.
  try {
    const reply = await (rsClient as any).config("GET", "notify-keyspace-events");
    const flags = Array.isArray(reply) ? String(reply[1] ?? "") : "";

    if (!flags.includes("E") || !flags.includes("x")) {
      psubcribeLogger.warn(
        `notify-keyspace-events is "${flags || "unset"}"; QR expiry falls back to WebSocket timers`,
      );
    }
  } catch (e) {
    psubcribeLogger.warn({ message: "cannot read notify-keyspace-events", error: e });
  }

  await rsClient.psubscribe('__keyevent@0__:expired');

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
