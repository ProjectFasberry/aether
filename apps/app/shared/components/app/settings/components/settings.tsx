import { reatomComponent } from "@reatom/npm-react"
import { settingsState } from "../models/settings.model"
import { Vaul, VaulContent, VaulHeader } from "@/shared/ui/vaul";
import { appState } from "@/shared/models/app/index.model";
import { SettingsNavigationDesktop } from "./settings-navigation";
import { SettingsContentDesktop, SettingsContentMobile } from "./settings-content";
import { Dialog } from '@ark-ui/react/dialog'
import { Portal } from '@ark-ui/react/portal'
import { dialogBackdropVariant, dialogBaseStyle, dialogCloseVariant, dialogContentVariant, dialogPositionerVariant } from "@/shared/ui/dialog";
import { IconX } from "@tabler/icons-react";

const SettingsDialog = reatomComponent(({ ctx }) => {
  return (
    <Dialog.Root open={ctx.spy(settingsState.isOpen)} onOpenChange={v => settingsState.isOpen(ctx, v.open)}>
      <Portal>
        <Dialog.Backdrop className={dialogBackdropVariant()} style={dialogBaseStyle} />
        <Dialog.Positioner className={dialogPositionerVariant()} >
          <Dialog.Content className={dialogContentVariant({ className: "p-0 h-2/3" })} style={dialogBaseStyle}>
            <div className="flex items-start w-full min-h-0 h-full">
              <div className="flex p-[clamp(0.5rem,3vw,1rem)] bg-neutral-950 h-full w-[clamp(120px,30%,400px)]">
                <SettingsNavigationDesktop />
              </div>
              <div className="flex-1 flex flex-col pb-[clamp(0.5rem,3vw,1rem)] px-[clamp(0.5rem,3vw,1rem)] pt-10 overflow-y-auto overflow-x-hidden h-full">
                <SettingsContentDesktop />
              </div>
            </div>
            <Dialog.CloseTrigger className={dialogCloseVariant()}>
              <IconX className="text-red" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}, "SettingsDialog")

export const Settings = reatomComponent(({ ctx }) => {
  const isMobile = ctx.spy(appState.current.isMobile);

  if (isMobile) {
    return (
      <Vaul openAtom={settingsState.isOpen}>
        <VaulContent className="h-2/3">
          <VaulHeader title="Настройки" />
          <SettingsContentMobile />
        </VaulContent>
      </Vaul>
    )
  }

  return <SettingsDialog />
}, "Settings")