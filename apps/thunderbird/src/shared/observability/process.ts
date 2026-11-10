import { natsService } from "#/shared/nats/client";
import { SUBJECTS } from "@repo/shared/constants/subjects";
import { appLogger } from "#/shared/constants/logger";
import { SERVICE_NAME } from "#/shared/constants/internal";
import { normalizeError } from "@repo/shared/utils";

export async function handleProcessOnEvent(sub: string, {
  error,
  kill = sub === "uncaughtException" || sub === "boot",
}: {
  error: Error | unknown, kill?: boolean
}) {
  appLogger.error(`${sub}: ${normalizeError(error)}`);

  const nc = natsService.getOptionalInstance()

  // A non-fatal error must not tear down the NATS connection: the process
  // keeps serving, and the next event still needs the client.
  if (nc && !nc.isClosed()) {
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
    } catch (e) {
      appLogger.error({ message: "Failed to send alert to NATS", error: e });
    }
  }

  if (kill) {
    process.exit(1);
  }
}
