import { IconLoader2 } from "@tabler/icons-react"
import type { ButtonHTMLAttributes } from "react"
import { tv, type VariantProps } from "tailwind-variants"

const buttonVariants = tv({
  base: `inline-flex px-4 py-2 rounded-xl duration-300 ease-in-out cursor-pointer items-center justify-center
    disabled:select-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-70
  `,
  variants: {
    variant: {
      default: "border-none border-transparent",
      danger: "border border-red text-red",
      minecraft: "rounded-none button"
    },
    background: {
      default: "bg-neutral-800 hover:bg-neutral-700 text-neutral-50",
      compound: "bg-neutral-800 text-neutral-50",
      white: "bg-neutral-200 hover:bg-neutral-50 text-neutral-950",
      positive: "bg-gradient-to-br text-neutral-50 from-green-600/90 via-green-600/80 font-semibold to-green-600/80"
    }
  }
})

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>
  & VariantProps<typeof buttonVariants> & (| {
    withSpinner?: true
    isLoading: boolean
  } | {
    withSpinner?: false,
    isLoading?: never
  })

export const Button = ({ className, isLoading, withSpinner, background, children, variant, ...props }: ButtonProps) => {
  return (
    <button
      className={buttonVariants({ className, background, variant })}
      {...props}
    >
      {(withSpinner && isLoading) && (
        <IconLoader2 className="animate-spin duration-300 mr-1" size={14} />
      )}
      {children}
    </button>
  )
}
