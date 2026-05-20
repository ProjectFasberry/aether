import type { AtomMut } from "@reatom/framework"
import { snapshotsMap } from "../ssr"
import { DEBUG_MODULES } from "./debug"

type ConfigItemMeta<T> =
  | { applyAs: "atom", applyTarget: AtomMut<T> }
  | { applyAs: "static", applyTarget?: never, onChange?: (value: T) => void }
  | { applyAs: "dynamic", applyTarget?: never }

export type ConfigItem<T = unknown> = {
  value: T, __meta: ConfigItemMeta<T>
}

export type DevtoolsConfig = {
  [K: string]: ConfigItem<any> | DevtoolsConfig;
};

const createConfig = <T extends DevtoolsConfig>(config: T): T => config;

/** Helper for defining the item if types is broken */
const defineItem = <T,>(item: ConfigItem<T>) => item;

const loggingConfig = createConfig({
  snapshot: {
    value: true,
    __meta: { applyAs: "static" }
  },
  atoms: {
    value: true,
    __meta: { applyAs: "static" }
  },
  actions: {
    value: true,
    __meta: { applyAs: "static" }
  }
})

const globalConfig = createConfig({
  flags: {
    "react-scan": defineItem({
      value: false,
      __meta: {
        applyAs: "static",
        onChange: (val) => val ? DEBUG_MODULES[0].activate() : DEBUG_MODULES[0].deactivate()
      }
    })
  },
  state: {
    snapshots: {
      value: snapshotsMap,
      __meta: { applyAs: "dynamic" }
    }
  }
})

export const devtoolsConfig = {
  logging: loggingConfig,
  global: globalConfig
} satisfies Record<string, DevtoolsConfig>;
