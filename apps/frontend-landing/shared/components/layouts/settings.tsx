import { localeAtom } from "@/shared/models/global.model";
import type { AtomState } from "@reatom/framework";
import { Dialog } from "@ark-ui/solid/dialog";
import { Typography } from "@/shared/ui/typography";
import { createListCollection, Select } from "@ark-ui/solid/select"
import { useAtom, useCtx } from "@reatom/npm-solid-js";
import { Index, Portal } from 'solid-js/web'
import { Icon } from "@/shared/ui/icon";
import {
  dialogBackdropVariant, DialogClose, dialogContentVariant, dialogPositionerVariant,
  dialogTitleVariant
} from "@/shared/ui/dialog";
import {
  selectClearTriggerVariant, selectContentVariant, selectControlVariant,
  selectIndicatorsVariant, selectIndicatorVariant, selectItemGroupVariant,
  selectItemIndicatorVariant, selectItemTextVariant, selectItemVariant, selectTriggerVariant
} from "@/shared/ui/select";
import { getStaticObject } from "@/shared/lib/helpers";
import {
  LANGUAGES, WEATHERS,
  layoutSettingsIsOpenAtom, layoutSettingsIsTriggeredAtom, selectedLangAtom,
  selectedWeatherAtom,
  weatherAtom,
} from "./settings.model";

const spyglassImage = getStaticObject("minecraft", "icons/fishing_bobber.webp")

const LayoutSettingsTrigger = () => {
  const ctx = useCtx();

  const [isTriggeredAtom] = useAtom(layoutSettingsIsTriggeredAtom)
  const [isOpenAtom] = useAtom(layoutSettingsIsOpenAtom)

  return (
    <button
      aria-label="Открыть настройки сайта"
      name="open-settings"
      onClick={() => layoutSettingsIsOpenAtom.open(ctx)}
      class={`top-2/3 group -translate-y-1/4 focus:scale-[1.1] cursor-pointer absolute right-4 w-12 h-12 z-[100] duration-500 ease-in-out
        ${isTriggeredAtom() ? "-translate-y-[9999px]" : "translate-y-0"}
        ${isOpenAtom() ? "hidden" : "block"}
      `}
    >
      <img src={spyglassImage} alt="" draggable={false} width={46} height={46} />
    </button>
  )
}

const weathers = createListCollection({ items: WEATHERS })
const languages = createListCollection({ items: LANGUAGES })

const Language = () => {
  const ctx = useCtx();
  const [selectedLang] = useAtom(selectedLangAtom);

  return (
    <div class="flex items-center justify-between w-full gap-1">
      <Typography>
        Язык
      </Typography>
      <Select.Root
        collection={languages}
        onValueChange={(details) => layoutSettingsIsOpenAtom.middleware(ctx, () => localeAtom(ctx, details.value[0] as AtomState<typeof localeAtom>))}
      >
        <Select.Control class={selectControlVariant()}>
          <Select.Trigger class={selectTriggerVariant()}>
            <Select.ValueText>
              {selectedLang().title}
            </Select.ValueText>
          </Select.Trigger>
          <div class={selectIndicatorsVariant()}>
            <Select.ClearTrigger class={selectClearTriggerVariant()}>
              <Icon name="sprite:x" />
            </Select.ClearTrigger>
            <Select.Indicator class={selectIndicatorVariant()}>
              {/*<ChevronsUpDownIcon />*/}
            </Select.Indicator>
          </div>
        </Select.Control>
        <Portal>
          <Select.Positioner>
            <Select.Content class={selectContentVariant()}>
              <Select.ItemGroup class={selectItemGroupVariant()}>
                <div class="flex flex-col gap-1 w-full h-full">
                  <Index each={LANGUAGES}>
                    {(item) => (
                      <Select.Item item={item()} class={selectItemVariant()}>
                        <Select.ItemText class={selectItemTextVariant()}>{item().title}</Select.ItemText>
                        <Select.ItemIndicator class={selectItemIndicatorVariant()}>✓</Select.ItemIndicator>
                      </Select.Item>
                    )}
                  </Index>
                </div>
              </Select.ItemGroup>
            </Select.Content>
          </Select.Positioner>
        </Portal>
        <Select.HiddenSelect />
      </Select.Root>
    </div>
  )
}

const Weather = () => {
  const ctx = useCtx();
  const [selectedWeather] = useAtom(selectedWeatherAtom);

  return (
    <div class="flex items-center justify-between w-full gap-1">
      <Typography>
        Погода
      </Typography>
      <Select.Root
        collection={weathers}
        onValueChange={(details) => layoutSettingsIsOpenAtom.middleware(ctx, () => weatherAtom(ctx, details.value[0] as AtomState<typeof weatherAtom>))}
      >
        <Select.Control class={selectControlVariant()}>
          <Select.Trigger class={selectTriggerVariant()}>
            <Select.ValueText>
              {selectedWeather().title}
            </Select.ValueText>
          </Select.Trigger>
          <div class={selectIndicatorsVariant()}>
            <Select.ClearTrigger class={selectClearTriggerVariant()}>
              <Icon name="sprite:x" />
            </Select.ClearTrigger>
            <Select.Indicator class={selectIndicatorVariant()}>
              {/*<ChevronsUpDownIcon />*/}
            </Select.Indicator>
          </div>
        </Select.Control>
        <Portal>
          <Select.Positioner>
            <Select.Content class={selectContentVariant()}>
              <Select.ItemGroup class={selectItemGroupVariant()}>
                <div class="flex flex-col gap-1 w-full h-full">
                  <Index each={WEATHERS}>
                    {(item) => (
                      <Select.Item item={item()} class={selectItemVariant()}>
                        <Select.ItemText class={selectItemTextVariant()}>{item().title}</Select.ItemText>
                        <Select.ItemIndicator class={selectItemIndicatorVariant()}>✓</Select.ItemIndicator>
                      </Select.Item>
                    )}
                  </Index>
                </div>
              </Select.ItemGroup>
            </Select.Content>
          </Select.Positioner>
        </Portal>
        <Select.HiddenSelect />
      </Select.Root>
    </div>
  )
}

const LayoutSettingsContent = () => {
  const [isOpenAtom, setIsOpenAtom] = useAtom(layoutSettingsIsOpenAtom);

  return (
    <Dialog.Root open={isOpenAtom()} onOpenChange={(details) => setIsOpenAtom(details.open)}>
      <Portal>
        <Dialog.Backdrop class={dialogBackdropVariant()} />
        <Dialog.Positioner class={dialogPositionerVariant()}>
          <Dialog.Content class={dialogContentVariant()}>
            <Dialog.Title class={dialogTitleVariant()}>Настройки</Dialog.Title>
            <div class="flex flex-col gap-2 w-full">
              <Weather />
              <Language />
            </div>
            <DialogClose />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

export const LayoutSettings = () => {
  return (
    <>
      <LayoutSettingsTrigger />
      <LayoutSettingsContent />
    </>
  )
}
