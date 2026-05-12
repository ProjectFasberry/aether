import { IconCheck } from "@tabler/icons-react"
import { tv, type VariantProps } from "tailwind-variants"
import { Checkbox as CheckboxDefault } from '@ark-ui/react/checkbox'
import { cn } from "../lib/cn"

const checkboxVariant = tv({
  base: `
    inline-flex items-center gap-1 peer relative border-2 group border-neutral-200 data-[state=checked]:text-neutral-50 data-[state=checked]:border-green-600
        focus-visible:border-neutral-600 focus-visible:ring-neutral-700/50 aria-invalid:ring-red-600/20
        aria-invalid:border-red-600 size-4 shrink-0
        rounded-[6px] transition-shadow outline-none focus-visible:ring-[3px]
        disabled:cursor-not-allowed disabled:opacity-50
  `,
  variants: {
    variant: {
      default: " ",
      filled: "data-[state=checked]:bg-green-600"
    },
  },
  defaultVariants: {
    variant: "default"
  }
})

export type CheckboxProps = VariantProps<typeof checkboxVariant> & {
  checked: boolean,
  onCheckedChange?: (open: boolean) => void,
  withIndicator?: boolean,
  className?: string,
  disabled?: boolean,
  id?: string,
  label?: string
}

export const Checkbox = ({
  checked, onCheckedChange, className, variant, disabled, withIndicator, id, label
}: CheckboxProps) => {
  return (
    <CheckboxDefault.Root
      id={id}
      checked={checked}
      onCheckedChange={(details) => typeof details.checked === 'boolean' && onCheckedChange?.(details.checked)}
      className={cn("inline-flex items-center gap-1 px-2 relative disabled:opacity-50 disabled:grayscale-[100%]", className)}
      disabled={disabled}
    >
      <CheckboxDefault.Control className={checkboxVariant({ variant })}>
        <CheckboxDefault.Indicator>
          {withIndicator && (
            <IconCheck size={14} className="group-data-[state=checked]:block group-data-[state=unchecked]:hidden m-auto -z-1" />
          )}
        </CheckboxDefault.Indicator>
      </CheckboxDefault.Control>
      {label && (
        <CheckboxDefault.Label className="select-none text-neutral-50 text-sm">
          {label}
        </CheckboxDefault.Label>
      )}
      <CheckboxDefault.HiddenInput />
    </CheckboxDefault.Root>
  )
}