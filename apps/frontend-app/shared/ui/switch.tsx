import { Switch as SwitchDefault, type SwitchRootProps } from "@ark-ui/react/switch"
import { IconLoader2 } from "@tabler/icons-react"
import { tv } from "tailwind-variants"

export type SwitchProps = SwitchRootProps & {
  label?: string
  isLoading?: boolean
}

const switchControlVariant = tv({
  base: `
    inline-flex duration-300 ease
    data-[state=checked]:bg-green-500 px-0.5 focus-visible:outline-2 focus-visible:outline-offset-2
    items-center shrink-0 w-9 h-5 bg-neutral-800 rounded-full
  `
})
const switchThumbVariant = tv({
  base: `
    flex items-center justify-center w-4 relative h-4 rounded-full bg-neutral-50
    data-[state=checked]:translate-x-4 duration-300 shadow-sm shadow-black/20 ease`
})
const switchLabelVariant = tv({
  base: `text-neutral text-sm select-none`
})

export const Switch = ({ label, isLoading, ...props }: SwitchProps) => {
  return (
    <SwitchDefault.Root
      {...props}
      className="inline-flex items-center gap-1 relative disabled:opacity-50"
    >
      <SwitchDefault.Control className={switchControlVariant()}>
        <SwitchDefault.Thumb className={switchThumbVariant()}>
          {isLoading && (
            <div className="absolute z-2 w-full h-full flex items-center justify-center inset-0">
              <IconLoader2 size={10} className="text-neutral-950 animate-spin duration-150 ease-in" />
            </div>
          )}
        </SwitchDefault.Thumb>
      </SwitchDefault.Control>
      {label && (
        <SwitchDefault.Label className={switchLabelVariant()}>
          {label}
        </SwitchDefault.Label>
      )}
      <SwitchDefault.HiddenInput />
    </SwitchDefault.Root>
  )
}
