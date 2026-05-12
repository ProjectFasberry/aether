import { reatomComponent } from "@reatom/npm-react"
import { settingsState, type SettingsParent } from "../models/settings.model"
import { lazy, type JSX } from "react"
import { SettingsMainAccount } from "./settings-main-account"
import { SettingsNavigationMobile } from "./settings-navigation"

const SettingsMainDevices = lazy(() => import("./settings-main-devices").then(m => ({ default: m.SettingsMainDevices })))
const SettingsStore = lazy(() => import("./settings-store").then(m => ({ default: m.SettingsStore })))
const SettingsMainSecurity = lazy(() => import("./settings-main-security").then(m => ({ default: m.SettingsMainSecurity })))
const SettingsMainConnections = lazy(() => import("./settings-main-connections").then(m => ({ default: m.SettingsMainConnections })))
const SettingsAppWidgets = lazy(() => import("./settings-app-widgets").then(m => ({ default: m.SettingsAppWidgets })))

const SETTINGS_NODES: Partial<Record<SettingsParent, Record<string, typeof SettingsAppWidgets | (() => JSX.Element)>>> = {
  main: {
    account: SettingsMainAccount,
    devices: SettingsMainDevices,
    security: SettingsMainSecurity,
    connections: SettingsMainConnections,
    store: SettingsStore
  },
  app: {
    appearance: SettingsAppWidgets
  }
}

export const SettingsContentMobile = reatomComponent(({ ctx }) => {
  const child = ctx.spy(settingsState.target)?.child;
  if (!child) return <SettingsNavigationMobile />

  const parent = ctx.spy(settingsState.target).parent;
  const Component = SETTINGS_NODES[parent]?.[child];

  return Component ? <Component/> : null;
}, "SettingsContentMobile")

export const SettingsContentDesktop = reatomComponent(({ ctx }) => {
  const child = ctx.spy(settingsState.target)?.child;
  if (!child) return null;

  const parent = ctx.spy(settingsState.target).parent
  const node = SETTINGS_NODES[parent]
  if (!node) return null;

  const Component = node[child];
  return Component ? <Component /> : null;
}, "SettingsContent")