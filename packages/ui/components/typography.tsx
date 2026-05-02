import type { HTMLAttributes } from "react";
import { tv, type VariantProps } from "tailwind-variants";

export const typographyVariants = tv({
  base: "",
  variants: {
    variant: {
      title: "text-xl sm:text-2xl lg:text-3xl font-bold",
      subtitle: "",
    },
    shadow: {
      none: "text-shadow-none",
      md: "text-shadow-md",
      lg: "text-shadow-lg",
      xl: "text-shadow-xl",
    },
    color: {
      "gray": "text-neutral-400",
      "black": "text-black",
      "white": "text-white"
    }
  }
})

type TypographyProps = HTMLAttributes<HTMLParagraphElement> & VariantProps<typeof typographyVariants>

export const Typography = ({ className, shadow, variant, color, ...props }: TypographyProps) => {
  return (
    <p className={typographyVariants({ variant, shadow, color, className })} {...props} />
  )
}