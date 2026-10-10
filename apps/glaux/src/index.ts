import "./assign";

import { isError } from "@repo/shared/utils";
import { handleProcessOnEvent } from "./shared/utils/handle-log";
import { getEnv } from "./shared/env";
import { boot, preboot, shutdown } from "./lifecycle";

try {
  preboot();
  await boot.start();

  const { startApp } = await import("./app");
  startApp();
} catch (e) {
  if (!getEnv().PROD) {
    console.error(e)
  }
  Promise.reject(isError(e) ? e : new Error("UNKNOWN"));
}

process
  .on("uncaughtException", (error) => handleProcessOnEvent("uncaughtException", { error }))
  .on("unhandledRejection", (error) => handleProcessOnEvent("unhandledRejection", { error }))
  .on("rejectionHandled", (error) => handleProcessOnEvent("rejectionHandled", { kill: false, error }))
  .on("warning", (error) => handleProcessOnEvent("warning", { error }))
  .on("SIGTERM", () => shutdown({ signal: "SIGTERM" }))
  .on("SIGINT", () => shutdown({ signal: "SIGINT" }));
