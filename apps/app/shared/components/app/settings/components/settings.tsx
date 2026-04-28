import { reatomComponent } from "@reatom/npm-react"
import { Dialog, DialogContent, DialogTitle } from "@repo/ui/dialog.js"
import { SettingsParent, settingsState } from "../models/settings.model"
import { SettingsAppWidgets } from "./settings-app-widgets";
import { SettingsMainSecurity } from "./settings-main-security";
import { SettingsMainConnections } from "./settings-main-connections";
import { Vaul, VaulContent, VaulHeader } from "@/shared/ui/vaul";
import { appState } from "@/shared/models/app.model";
import { ReactNode } from "react";
import { SettingsNavigationDesktop, SettingsNavigationMobile } from "./settings-navigation";
import { SettingsStore } from "./settings-store";
import { SettingsMainDevices } from "./settings-main-devices";
import { SettingsMainAccount } from "./settings-main-account";

const SETTINGS_NODES: Partial<Record<SettingsParent, Record<string, ReactNode>>> = {
  main: {
    account: <SettingsMainAccount />,
    devices: <SettingsMainDevices />,
    security: <SettingsMainSecurity />,
    connections: <SettingsMainConnections />,
    store: <SettingsStore />
  },
  app: {
    appearance: <SettingsAppWidgets />
  }
}

const SettingsContentMobile = reatomComponent(({ ctx }) => {
  const child = ctx.spy(settingsState.target)?.child;
  if (!child) return <SettingsNavigationMobile />

  const parent = ctx.spy(settingsState.target).parent;
  return SETTINGS_NODES[parent]?.[child]
}, "SettingsContentMobile")

const SettingsContentDesktop = reatomComponent(({ ctx }) => {
  const child = ctx.spy(settingsState.target)?.child;
  if (!child) return null;

  const parent = ctx.spy(settingsState.target).parent
  const node = SETTINGS_NODES[parent]
  if (!node) return null;

  const component = node[child]

  return component
}, "SettingsContent")

export const SettingsDialog = reatomComponent(({ ctx }) => {  
  const open = ctx.spy(settingsState.dialogIsOpen)
  const isMobile = ctx.spy(appState.isMobile);

  const handle = (v: boolean) => settingsState.dialogIsOpen(ctx, v)

  if (isMobile) {
    return (
      <Vaul open={open} onOpenChange={handle}>
        <VaulContent className="h-2/3">
          <VaulHeader title="Настройки" />
          <SettingsContentMobile />
        </VaulContent>
      </Vaul>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handle}>
      <DialogContent className="p-0! overflow-hidden h-2/3">
        <DialogTitle className="hidden"></DialogTitle>
        <div className="flex items-start w-full min-h-0 h-full">
          <div className="flex p-[clamp(0.5rem,3vw,1rem)] bg-neutral-950 h-full w-[clamp(120px,30%,400px)]">
            <SettingsNavigationDesktop />
          </div>
          <div className="flex-1 flex flex-col pb-[clamp(0.5rem,3vw,1rem)] px-[clamp(0.5rem,3vw,1rem)] pt-10 overflow-y-auto overflow-x-hidden h-full">
            <SettingsContentDesktop />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}, "SettingsDialog")