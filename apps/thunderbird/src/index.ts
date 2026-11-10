import "../declare.d.ts";
import "./assign";

import { isError } from "@repo/shared/utils";
import { lifecycle, preboot } from "./lifecycle";
import { handleProcessOnEvent } from "./shared/observability/process";
import { getEnv } from "./shared/env";
import { appLogger } from "./shared/constants/logger";

try {
  preboot();
  await lifecycle.start();
} catch (e) {
  if (!getEnv().PROD) {
    appLogger.error(e)
  }

  await handleProcessOnEvent("boot", {
    error: isError(e) ? e : new Error("UNKNOWN"), kill: true
  });
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
  .on("unhandledRejection", (error) => handleProcessOnEvent("unhandledRejection", { kill: false, error }))
  .on("rejectionHandled", (error) => handleProcessOnEvent("rejectionHandled", { kill: false, error }))
  .on("warning", (error) => handleProcessOnEvent("warning", { kill: false, error }))
  .on("SIGTERM", () => stop("SIGTERM"))
  .on("SIGINT", () => stop("SIGINT"));