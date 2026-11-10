export type LoggingState<K extends string = string> = {
  logging: Record<K, boolean>;
};

export type LoggingStateView<K extends string = string> = {
  readonly logging: Readonly<Record<K, boolean>>;
};

export type LoggingStateController<K extends string = string> = {
  readonly flags: readonly K[];
  getState: () => LoggingStateView<K>;
  update: (key: K | `logging.${K}`, value: boolean) => void;
  tryUpdate: (key: string, value: boolean) => boolean;
  apply: (stored: Partial<LoggingState<K>>) => void;
  logging: LoggingStateView<K>["logging"];
};

const keyFromPath = <K extends string>(flags: readonly K[], key: string): K | null => {
  const value = key.startsWith("logging.") ? key.slice("logging.".length) : key;

  return flags.includes(value as K) ? (value as K) : null;
};

const freeze = <K extends string>(state: LoggingState<K>): LoggingStateView<K> => Object.freeze({
  logging: Object.freeze({ ...state.logging }),
});

/**
 * Shared runtime logging switches.
 *
 * Apps provide only their flag list and defaults; the getter object, snapshot,
 * update/apply semantics and the legacy `requests -> outboundRequests`
 * migration stay in one place.
 */
export function createLoggingState<const K extends string>(
  flags: readonly K[],
  defaults: Record<K, boolean>,
): LoggingStateController<K> {
  let state: LoggingState<K> = { logging: { ...defaults } };
  let snapshot = freeze(state);

  const logging = {} as Record<K, boolean>;

  for (const flag of flags) {
    Object.defineProperty(logging, flag, {
      enumerable: true,
      get: () => state.logging[flag],
    });
  }

  const update = (key: K | `logging.${K}`, value: boolean): void => {
    const flag = keyFromPath(flags, key);
    if (!flag || !(flag in state.logging)) return;

    state = {
      logging: {
        ...state.logging,
        [flag]: value,
      },
    };
    snapshot = freeze(state);
  };

  return {
    flags,
    getState: () => snapshot,
    update,
    tryUpdate(key, value) {
      const flag = keyFromPath(flags, key);
      if (!flag) return false;

      update(flag, value);
      return true;
    },
    apply(stored) {
      for (const flag of flags) {
        const value = stored.logging?.[flag];
        if (typeof value === "boolean") update(flag, value);
      }

      // Pre-split snapshots used `requests` for the outgoing client.
      if (
        flags.includes("requests" as K) &&
        flags.includes("outboundRequests" as K) &&
        typeof stored.logging?.["requests" as K] === "boolean" &&
        typeof stored.logging?.["outboundRequests" as K] !== "boolean"
      ) {
        update("outboundRequests" as K, stored.logging["requests" as K] as boolean);
      }
    },
    logging,
  };
}
