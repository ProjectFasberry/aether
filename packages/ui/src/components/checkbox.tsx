import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { cn } from '../lib/cn';
import type { ComponentProps } from "react";

type CheckboxProps = ComponentProps<typeof CheckboxPrimitive.Root>

function Checkbox({
  className,
  ...props
}: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        `peer border-2 border-neutral-200 data-[state=checked]:text-neutral-50 
        focus-visible:border-neutral-600 focus-visible:ring-neutral-700/50 aria-invalid:ring-red-600/20 
        aria-invalid:border-red-600 size-4 shrink-0 data-[state=checked]:border-green-400
        rounded-[6px] transition-shadow outline-none focus-visible:ring-[3px] 
        disabled:cursor-not-allowed disabled:opacity-50`,
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox, type CheckboxProps }
