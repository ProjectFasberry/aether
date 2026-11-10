import { createShutdownState } from "@repo/shared/utils";

const state = createShutdownState();

export const isShuttingDown = state.isShuttingDown;
export const shutdownSignal = state.shutdownSignal;
export const beginShutdown = state.beginShutdown;
