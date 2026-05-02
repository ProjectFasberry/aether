import type { HTMLAttributes } from "react"
import { tv, type VariantProps } from 'tailwind-variants';

const layoutVars = tv({
  base: 'min-h-screen',
  variants: {
    variant: {
      default: "responsive mx-auto py-24 lg:py-36",
      with_section: "w-full"
    }
  },
  defaultVariants: {
    variant: 'default',
  }
});

interface LayoutVariantsProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof layoutVars> {}

export const MainWrapperPage = ({
  className, variant, ...props
}: LayoutVariantsProps) => {
  return <div className={layoutVars({ variant, className })} {...props} />
}