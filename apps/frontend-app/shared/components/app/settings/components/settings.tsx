import { reatomComponent } from "@reatom/npm-react"
import { settingsState } from "../models/settings.model"
import { Vaul, VaulContent, VaulHeader } from "@/shared/ui/vaul";
import { appState } from "@/shared/models/app/index.model";
import { SettingsNavigationDesktop } from "./settings-navigation";
import { SettingsContentDesktop, SettingsContentMobile } from "./settings-content";
import { Dialog } from '@ark-ui/react/dialog'
import { Portal } from '@ark-ui/react/portal'
import { dialogBackdropVariant, dialogBaseStyle, DialogClose, dialogContentVariant, dialogPositionerVariant } from "@/shared/ui/dialog";

const SettingsDialog = reatomComponent(({ ctx }) => {
  return (
    <Dialog.Root
      open={ctx.spy(settingsState.isOpen)}
      onOpenChange={v => settingsState.isOpen(ctx, v.open)}
    >
      <Portal>
        <Dialog.Backdrop className={dialogBackdropVariant()} style={dialogBaseStyle} />
        <Dialog.Positioner className={dialogPositionerVariant()} >
          <Dialog.Content
            className={dialogContentVariant({ className: "p-0 sm:p-0 h-2/3" })}
            style={dialogBaseStyle}
          >
            <div className="flex items-start w-full min-h-0 h-full">
              <div
                className="
                  flex p-[clamp(0.5rem,3vw,1rem)] bg-neutral-950 h-full w-[clamp(120px,30%,400px)]
                "
              >
                <SettingsNavigationDesktop />
              </div>
              <div
                className="
                  flex-1 flex flex-col overflow-y-auto overflow-x-hidden h-full
                  pb-[clamp(0.5rem,3vw,1rem)] px-[clamp(0.5rem,3vw,1rem)] pt-10
                "
              >
                <SettingsContentDesktop />
              </div>
            </div>
            <DialogClose />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}, "SettingsDialog")

const SettingsDrawer = () => {
  return (
    <Vaul openAtom={settingsState.isOpen}>
      <VaulContent className="h-2/3">
        <VaulHeader title="Настройки" />
        <div className="overflow-y-auto">
          <SettingsContentMobile />
        </div>
      </VaulContent>
    </Vaul>
  )
}

export const Settings = reatomComponent(({ ctx }) =>
  ctx.spy(appState.current.isMobile) ? <SettingsDrawer /> : <SettingsDialog />, "Settings"
)
