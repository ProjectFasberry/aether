export const getAuthHeaderWithBtoa = (user: string, password: string) => ({
  "Authorization": `Basic ${btoa(`${user}:${password}`)}`,
});

type Options<T> = {
  timeout: number,
  rollback?: () => Promise<void> | void;
  fallback?: T | (() => T | Promise<T>);
};

export async function taskWithTimeout<T>(
  task: (signal: AbortSignal) => Promise<T>,
  options?: Options<T>
): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = options?.timeout ?? 5000;

  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Task timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    controller.signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
  });

  try {
    return await Promise.race([
      task(controller.signal),
      timeoutPromise
    ]);
  } catch (error) {
    if (options?.rollback) {
      try {
        await options.rollback();
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }
    }

    if (options && "fallback" in options && options.fallback !== undefined) {
      const fallback = options.fallback;
      return (
        typeof fallback === "function"
          ? await (fallback as () => T | Promise<T>)()
          : fallback
      ) as T;
    }

    throw error;
  }
}

export function defineVerbose() {
  let verbose = Bun.env.NODE_ENV === 'production'

  for (const arg of Bun.argv.slice(2)) {
    if (["-v", "--verbose", "--verbose=true"].includes(arg)) {
      verbose = true;
    }
    if (["--verbose=false"].includes(arg)) {
      verbose = false;
    }
  }

  return verbose;
}
