import { updateInDeep } from "#/helpers/object";

type ServiceStateShape = {
  logging: {
    validators: boolean;
    globalError: boolean;
    requests: boolean;
  };
};

let _state: ServiceStateShape = {
  logging: {
    validators: false,
    globalError: true,
    requests: false,
  },
};

export const getServiceState = () => structuredClone(_state);

export function updateState(key: string, value: boolean) {
  _state = updateInDeep<ServiceStateShape>(_state, key, value);
}

export type ServiceState = ServiceStateShape;

/** Applies a state snapshot coming from Redis without mutating the argument. */
export function applyServiceState(state: Partial<ServiceState>): void {
  for (const [key, value] of Object.entries(state.logging ?? {})) {
    if (typeof value === "boolean") updateState(`logging.${key}`, value);
  }
}

/**
 * Live view of the service switches. Reading through getters keeps consumers
 * correct after `updateState`, which replaces the state object.
 */
export const logging: ServiceState["logging"] = {
  get validators() {
    return _state.logging.validators;
  },
  get globalError() {
    return _state.logging.globalError;
  },
  get requests() {
    return _state.logging.requests;
  },
};
