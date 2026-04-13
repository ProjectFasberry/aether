import type { InputHTMLAttributes } from "react"
import { tv, type VariantProps } from "tailwind-variants"

const inputVariants = tv({
  base: `
    inline-flex px-4 py-2 text-base rounded-xl placeholder:text-neutral-400
    focus-within:outline border focus-within:border-2 focus-within:outline-green
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

type InputProps = InputHTMLAttributes<HTMLInputElement> & VariantProps<typeof inputVariants>

export const Input = ({ className, variant, ...props }: InputProps) => {
  return (
    <input className={inputVariants({ className, variant })} {...props} />
  )
}