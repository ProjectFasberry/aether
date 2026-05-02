import type { HTMLAttributes } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';

const overlayVariants = tv({
  base: `block absolute right-0 left-0 bg-gradient-to-tr from-black/80 to-transparent h-full`,
  variants: {
    variant: {
      default: "to-55%",
      over: "to-90%",
      mini: "to-20%",
      screen: "top-0 right-0 left-0 z-10 bg-black/30 min-h-screen"
    },
    defaultVariants: {
      variant: "default"
    }
  }
})

export interface OverlayVariantsProps
  extends HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof overlayVariants> { }

export const Overlay = ({ className, variant, ...props }: OverlayVariantsProps) => {
  return <div className={overlayVariants({ className, variant })} {...props} />
}