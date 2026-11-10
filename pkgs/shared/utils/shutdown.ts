export type ShutdownState = {
  isShuttingDown: () => boolean;
  shutdownSignal: AbortSignal;
  beginShutdown: () => void;
};

/** Per-process drain state shared by HTTP, SSE and readiness checks. */
export function createShutdownState(): ShutdownState {
  let shuttingDown = false;
  const controller = new AbortController();

  return {
    isShuttingDown: () => shuttingDown,
    shutdownSignal: controller.signal,
    beginShutdown() {
      if (shuttingDown) return;

      shuttingDown = true;
      controller.abort();
    },
  };
}
