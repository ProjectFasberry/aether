import "./assign";

import { isError } from "@repo/shared/utils";
import { handleProcessOnEvent, publishHealthAlert } from "./shared/utils/handle-log";
import { getEnv } from "./shared/env";
import { lifecycle, preboot } from "./lifecycle";
import { appLogger } from "./shared/logger";

try {
  preboot();
  await lifecycle.start();
} catch (e) {
  if (!getEnv().PROD) {
    appLogger.error(e)
  }

  await publishHealthAlert(`boot: ${isError(e) ? e.message : "UNKNOWN"}`).catch(() => undefined);
  process.exit(1);
}

const stop = async (signal: string) => {
  const force = setTimeout(() => process.exit(1), 10_000);
  force.unref();

  await lifecycle.stop(signal);

  clearTimeout(force);
  process.exit(0);
};

process
  .on("uncaughtException", (error) => handleProcessOnEvent("uncaughtException", { error }))
  .on("unhandledRejection", (error) => handleProcessOnEvent("unhandledRejection", { error }))
  .on("rejectionHandled", (error) => handleProcessOnEvent("rejectionHandled", { kill: false, error }))
  .on("warning", (error) => handleProcessOnEvent("warning", { error }))
  .on("SIGTERM", () => stop("SIGTERM"))
  .on("SIGINT", () => stop("SIGINT"));
