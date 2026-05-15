import type { ComponentPropsWithRef } from "react"
import { tv, type VariantProps } from "tailwind-variants"

const inputVariants = tv({
  base: `
    inline-flex px-4 py-2 h-10 text-sm sm:text-base rounded-xl placeholder:text-neutral-400
    border outline-none border-transparent focus-within:ring-2 focus-within:ring-inset focus-within:ring-green-500
  `,
  variants: {
    variant: {
      default: "bg-neutral-800",
      ghost: "bg-transparent",
      danger: "ring-2 ring-inset ring-red"
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