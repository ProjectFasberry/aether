import { SERVICE_NAME } from "#/shared/constants/internal";
import { isProduction } from "#/shared/env";
import { getNats } from "#/shared/nats/client";
import { SUBJECTS } from "#/shared/nats/subjects";

export async function handleFatalError(error: Error | unknown) {
  if (!isProduction) return;

  let msg: string = ""
  
  if (error instanceof Error) {
    msg = error.message
  } else {
    msg = `UNHANDLED REJECTION: ${error}`
  }

  const nc = getNats()

  nc.publish(SUBJECTS.INTERNAL.HEALTH, JSON.stringify({
    data: msg,
    type: "error",
    service: SERVICE_NAME,
  }))

  process.exit(1);
}