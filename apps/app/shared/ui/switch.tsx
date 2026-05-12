import { Switch as SwitchDefault } from "@ark-ui/react/switch"

export const Switch = ({ disabled, label, checked, onCheckedChange }: {
  checked: boolean, onCheckedChange: (v: boolean) => void, disabled?: boolean, label?: string
}) => {
  return (
    <SwitchDefault.Root
      checked={checked}
      disabled={disabled}
      onCheckedChange={(e) => onCheckedChange(e.checked)}
      className="inline-flex items-center gap-1 relative disabled:opacity-50"
    >
      <SwitchDefault.Control
        className="
          inline-flex duration-300 ease 
        data-[state=checked]:bg-green-500 px-0.5 focus-visible:outline-2 focus-visible:outline-offset-2
          items-center shrink-0 w-10 h-6 bg-neutral-800 rounded-full
        "
      >
        <SwitchDefault.Thumb
          className="flex items-center justify-center w-5 h-5 rounded-full bg-neutral-50
            data-[state=checked]:translate-x-4 duration-300 shadow-sm shadow-black/20 ease
          "
        />
      </SwitchDefault.Control>
      {label && (
        <SwitchDefault.Label className="text-neutral text-sm select-none">
          {label}
        </SwitchDefault.Label>
      )}
      <SwitchDefault.HiddenInput />
    </SwitchDefault.Root>
  )
}