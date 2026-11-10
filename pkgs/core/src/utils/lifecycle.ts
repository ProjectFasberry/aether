import { logger } from "@repo/shared/utils/logger";
import { normalizeError, sleep, withTimeout } from "@repo/shared/utils";

export type LifecycleState =
  | "idle"
  | "starting"
  | "ready"
  | "degraded"
  | "stopping"
  | "stopped"
  | "failed";

export type ResourceStatus =
  | "pending"
  | "starting"
  | "ready"
  | "failed"
  | "stopped";

export type ResourceSpec<T = unknown> = {
  start: () => Promise<T> | T;
  stop?: (value: T) => Promise<void> | void;
  dependsOn?: string | readonly string[];
  /** A critical failure aborts boot and rolls back started resources. */
  critical?: boolean;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
};

export type LifecycleOptions = {
  name?: string;
  /** Runs before the first resource is stopped (drain/readiness flag). */
  onStopping?: () => void;
  /**
   * Runs right before rollback on a critical boot failure, while resources such
   * as NATS are still connected. Alerting must not block the rollback.
   */
  onCriticalFailure?: (failure: { name: string; error: unknown }) => void | Promise<void>;
};

export type ResourceHealth = {
  name: string;
  status: ResourceStatus;
  critical: boolean;
  error?: unknown;
};

export type LifecycleHealth = {
  state: LifecycleState;
  resources: ResourceHealth[];
};

export type Lifecycle = {
  start: () => Promise<LifecycleHealth>;
  stop: (reason?: string) => Promise<LifecycleHealth>;
  health: () => LifecycleHealth;
  state: () => LifecycleState;
};

type ResourceEntry = {
  spec: ResourceSpec<any>;
  status: ResourceStatus;
  value?: unknown;
  error?: unknown;
};

type ResourceMap<R> = {
  [K in keyof R]: Omit<R[K], "dependsOn"> & {
    dependsOn?: Extract<keyof R, string> | readonly Extract<keyof R, string>[];
  };
};

export function createLifecycle<const R extends Record<string, ResourceSpec<any>>>(
  resources: ResourceMap<R>,
  options: LifecycleOptions = {},
): Lifecycle {
  const lifecycleLogger = logger.child({
    name: options.name ?? "lifecycle"
  });

  const entries = new Map<string, ResourceEntry>();
  const order = Object.keys(resources);

  const normalizeDeps = (value: string | readonly string[] | undefined): string[] => {
    if (!value) return [];
    if (typeof value === "string") return [value];
    return [...value];
  };

  for (const name of order) {
    const spec = resources[name]!;

    entries.set(name, {
      spec: { ...spec, dependsOn: normalizeDeps(spec.dependsOn) },
      status: "pending",
    });
  }

  let curr: LifecycleState = "idle";
  const started: string[] = [];

  const health = (): LifecycleHealth => ({
    state: curr,
    resources: [...entries].map(([name, entry]) => ({
      name,
      status: entry.status,
      critical: entry.spec.critical !== false,
      error: entry.error,
    })),
  });

  const setState = (state: LifecycleState) => {
    curr = state;
  };

  const validate = () => {
    for (const [name, entry] of entries) {
      for (const dep of entry.spec.dependsOn ?? []) {
        if (!entries.has(dep)) {
          throw new Error(`Resource "${name}" depends on unknown "${dep}"`);
        }

        if (order.indexOf(dep) >= order.indexOf(name)) {
          throw new Error(`Resource "${name}" depends on "${dep}", which is declared below it`);
        }
      }
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (name: string) => {
      if (visited.has(name)) return;

      if (visiting.has(name)) {
        throw new Error(`Circular resource dependency at "${name}"`);
      }
      visiting.add(name);

      for (const dep of entries.get(name)?.spec.dependsOn ?? []) {
        visit(dep);
      };

      visiting.delete(name);
      visited.add(name);
    };

    for (const name of entries.keys()) {
      visit(name);
    }
  };

  const starts = new Map<string, Promise<void>>();

  const startOne = (name: string): Promise<void> => {
    const isExist = starts.get(name);
    if (isExist) return isExist;

    const entry = entries.get(name);
    if (!entry || ["ready", "failed"].includes(entry.status)) {
      return Promise.resolve();
    }

    entry.status = "starting";

    const promise = (async () => {
      const deps = Array.isArray(entry.spec.dependsOn) ? entry.spec.dependsOn : [];
      await Promise.all(deps.map(startOne));

      const failedDep = deps.find((dep) => {
        const depEntry = entries.get(dep);
        return depEntry?.status === "failed" && depEntry.spec.critical !== false;
      });

      if (failedDep) {
        entry.status = "failed";
        entry.error = new Error(`Dependency "${failedDep}" failed`);
        return;
      }

      const retries = entry.spec.retries ?? 0;
      const retryDelayMs = entry.spec.retryDelayMs ?? 250;
      const startedAt = Date.now();

      for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
          entry.value = await withTimeout(() => entry.spec.start(), entry.spec.timeoutMs);
          entry.status = "ready";
          started.push(name);

          lifecycleLogger.debug(`resource started: ${name} (${Date.now() - startedAt}ms)`);
          return;
        } catch (e) {
          entry.error = e;

          if (attempt < retries) {
            lifecycleLogger.warn(
              `resource start retry: ${name} attempt ${attempt + 1} (${normalizeError(e)})`,
            );

            await sleep(retryDelayMs * 2 ** attempt);
            continue;
          }

          entry.status = "failed";

          lifecycleLogger.error(
            `resource failed: ${name} (critical=${entry.spec.critical !== false}): ${normalizeError(e)}`,
          );
          return;
        }
      }
    })().finally(() => starts.delete(name));

    starts.set(name, promise);
    return promise;
  };

  const stopStarted = async (reason?: string) => {
    for (const name of [...started].reverse()) {
      const entry = entries.get(name);
      if (!entry || entry.status !== "ready") continue;

      try {
        await withTimeout(() => entry.spec.stop?.(entry.value), entry.spec.timeoutMs);
        entry.status = "stopped";

        lifecycleLogger.debug(`resource stopped: ${name}`);
      } catch (error) {
        entry.error = error;
        lifecycleLogger.error(`resource stop failed: ${name}: ${normalizeError(error)}`);
      }
    }

    started.length = 0;

    if (reason) {
      lifecycleLogger.info(`Stopped: ${reason}`);
    }
  };

  return {
    async start() {
      if (curr === "ready" || curr === "degraded") return health();
      if (curr === "starting") throw new Error("Lifecycle is already starting");

      validate();
      curr = "starting";

      const startedAt = Date.now();
      lifecycleLogger.info(`Starting ${entries.size} resources`);

      await Promise.allSettled([...entries.keys()].map(startOne));

      const failed = [...entries].filter(([, entry]) => entry.status === "failed");
      const criticalFailure = failed.find(([, entry]) => entry.spec.critical !== false);

      if (criticalFailure) {
        const [name, entry] = criticalFailure;
        setState("failed");

        try {
          await options.onCriticalFailure?.({ name, error: entry.error });
        } catch (hookError) {
          lifecycleLogger.error(`critical failure hook failed: ${normalizeError(hookError)}`);
        }

        await stopStarted("critical boot failure");
        throw new Error(`Critical resource "${name}" failed: ${normalizeError(entry.error)}`);
      }

      setState(failed.length > 0 ? "degraded" : "ready");
      lifecycleLogger.info(
        `Lifecycle ${curr} in ${Date.now() - startedAt}ms` +
        (failed.length > 0 ? ` (${failed.length} degraded)` : ""),
      );

      return health();
    },
    async stop(reason = "shutdown") {
      if (curr === "stopped" || curr === "stopping") return health();

      options.onStopping?.();
      setState("stopping");
      lifecycleLogger.info(`Stopping resources: ${reason}`);

      await stopStarted(reason);
      setState("stopped");

      return health();
    },
    health,
    state: () => curr,
  };
}

type DepSpec<K extends string, T> = Omit<ResourceSpec<T>, "dependsOn"> & {
  dependsOn?: K | readonly K[];
};

class LifecycleBuilder<K extends string = never> {
  private readonly resources: Record<string, ResourceSpec<any>> = {};

  add<Name extends string, T>(name: Name, spec: DepSpec<K, T>): LifecycleBuilder<K | Name> {
    this.resources[name] = spec;
    return this as unknown as LifecycleBuilder<K | Name>;
  }

  build(opts: LifecycleOptions = {}): Lifecycle {
    return createLifecycle(this.resources, opts);
  }
}

export function defineLifecycle<K extends string = never>(): LifecycleBuilder<K> {
  return new LifecycleBuilder<K>();
}
