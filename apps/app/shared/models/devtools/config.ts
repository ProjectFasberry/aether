import { AtomMut } from "@reatom/framework"
import { userState } from "../app.model"

type ConfigItemMeta<T> = {
  applyAs: "atom",
  applyTarget: AtomMut<T>
} | {
  applyAs: "static",
  applyTarget?: never
}

export type ConfigItem<T = unknown> = { 
  value: T, 
  __meta: ConfigItemMeta<T> 
}

export type DevtoolsConfig = {
  [key: string]: ConfigItem<any> | DevtoolsConfig;
};

const createConfig = <T extends DevtoolsConfig>(config: T): T => config;

export const authConfig = createConfig({
  state: {
    isAuthed: {
      value: false,
      __meta: {
        applyAs: "atom",
        applyTarget: userState.isAuthedManual
      }
    }
  }
})

export const loggingConfig = createConfig({
  snapshot: {
    value: true,
    __meta: {
      applyAs: "static"
    }
  },
  atoms: {
    value: true,
    __meta: {
      applyAs: "static"
    }
  },
  actions: {
    value: true,
    __meta: {
      applyAs: "static"
    }
  }
})

export const devtoolsConfig = {
  logging: loggingConfig,
  auth: authConfig
} satisfies Record<string, DevtoolsConfig>;