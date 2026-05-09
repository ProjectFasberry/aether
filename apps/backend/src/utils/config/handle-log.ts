import { nats } from "#/shared/nats/client";
import { SUBJECTS } from "@repo/shared/constants/subjects";
import { appLogger } from "./logger";
import { SERVICE_NAME } from "#/shared/constants/internal";

export async function handleProcessOnEvent(sub: string, {
  error, kill = true
}: {
  error: Error | unknown, kill?: boolean
}) {
  appLogger.error(handleProcessOnEvent.name, sub, error);

  //#region todo: impl logging/alerting using fluentbit + grafana
  const nc = nats.get()
  const msg = error instanceof Error ? error.message : `UNKNOWN: ${error}`;

  try {
    nc.publish(SUBJECTS.INTERNAL.HEALTH, JSON.stringify({
      data: msg,
      timestamp: Date.now(),
      from: SERVICE_NAME
    }))
  
    await Promise.race([
      nc.flush(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('NATS Timeout')), 1000))
    ]);
  
    await nc.close();
  } catch (e) {
    console.error("Failed to send alert to NATS:", e);
  }
  //#endregion

  if (kill) {
    process.exit(1);
  }
}