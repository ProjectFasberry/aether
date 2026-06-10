import { updateInDeep } from "#/helpers/object";

let _state = {
  logging: {
    validators: false,
    globalError: true,
    requests: false
  }
}

export const getServiceState = () => structuredClone(_state);
export function updateState(key: string, value: boolean) {
  _state = updateInDeep<typeof _state>(_state, key, value)
};

export type ServiceState = typeof _state;

export const logging = getServiceState().logging
