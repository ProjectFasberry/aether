import { tv } from "tailwind-variants";

export const scrollableVariant = tv({
  base: `scrollbar scrollbar-thumb-rounded-full`,
  variants: {
    variant: {
      default: "scrollbar-thumb-neutral-800",
      hovered: "scrollbar-hover:scrollbar-thumb-neutral-800",
    }
  },
  defaultVariants: {
    variant: "default"
  }
})