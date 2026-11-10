import { createLoggingState, type LoggingState } from "@repo/shared/utils";

export const LOGGING_FLAGS = [
  "validators",
  "globalError",
  "services",
  "requests",
  "outboundRequests",
] as const;

export type LoggingKey = (typeof LOGGING_FLAGS)[number];
export type ServiceState = LoggingState<LoggingKey>;

const isProdStage = (Bun.env["STAGE"] ?? "dev") === "prod";

export const serviceState = createLoggingState(LOGGING_FLAGS, {
  validators: false,
  globalError: true,
  services: true,
  requests: !isProdStage,
  outboundRequests: !isProdStage,
});

export const getServiceState = serviceState.getState;
export const updateState = serviceState.update;
export const tryUpdateState = serviceState.tryUpdate;
export const applyServiceState = serviceState.apply;
export const logging = serviceState.logging;
