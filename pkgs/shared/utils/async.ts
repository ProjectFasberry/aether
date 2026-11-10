export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs `task` with an optional timeout. Without a timeout it still defers the
 * call to the next microtask, so callers get a consistent promise shape.
 */
export function withTimeout<T>(
  task: () => Promise<T> | T,
  timeoutMs?: number,
): Promise<T> {
  if (!timeoutMs) return Promise.resolve().then(task);

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Task timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );

    Promise.resolve()
      .then(task)
      .then(resolve, reject)
      .finally(() => clearTimeout(timer));
  });
}
