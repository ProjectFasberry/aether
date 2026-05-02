import { Checkbox as CheckboxPrimitive } from "radix-ui"
import type { ComponentProps } from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { IconCheck } from "@tabler/icons-react";

type CheckboxProps = ComponentProps<typeof CheckboxPrimitive.Root> & VariantProps<typeof checkboxVariant> & {
  withIndicator?: boolean
}

const checkboxVariant = tv({
  base: `
    peer border-2 border-neutral-200 data-[state=checked]:text-neutral-50 data-[state=checked]:border-green-600
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

function Checkbox({ variant, className, withIndicator = false, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={checkboxVariant({ variant, className })}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        {withIndicator && <IconCheck size={14} />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox, type CheckboxProps }