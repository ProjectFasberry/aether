import { InputHTMLAttributes } from "react"
import { tv, VariantProps } from "tailwind-variants"

const inputVariants = tv({
  base: `
    inline-flex px-4 py-2 text-lg rounded-xl placeholder:text-neutral-400
    focus-within:outline focus-within:outline-2 focus-within:outline-green
  `,
  variants: {
    variant: {
      default: "bg-neutral-800"
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