import type { ComponentPropsWithRef } from "react"
import { tv, type VariantProps } from "tailwind-variants"

const inputVariants = tv({
  base: `
    inline-flex px-4 py-2 text-base rounded-xl placeholder:text-neutral-400
    focus-within:outline border border-transparent focus-within:border-2 focus-within:outline-green
  `,
  variants: {
    variant: {
      default: "bg-neutral-800",
      ghost: "bg-transparent"
    }
  },
  defaultVariants: {
    variant: "default"
  }
})

type InputProps = ComponentPropsWithRef<"input"> & VariantProps<typeof inputVariants>

export const Input = ({ className, variant, ...props }: InputProps) => {
  return (
    <input className={inputVariants({ className, variant })} {...props} />
  )
}