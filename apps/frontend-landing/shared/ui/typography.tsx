import { mergeProps, splitProps, JSX } from "solid-js";
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
      gray: "text-neutral-400",
      black: "text-black",
      white: "text-white",
    },
  },
});

type TypographyProps = VariantProps<typeof typographyVariants> & {
  class?: string;
} & JSX.HTMLAttributes<HTMLParagraphElement>;

export const Typography = (props: TypographyProps) => {
  const merged = mergeProps({ variant: undefined, shadow: undefined, color: undefined }, props);

  const [local, rest] = splitProps(merged, ["variant", "shadow", "color", "class"]);

  return (
    <p
      class={typographyVariants({
        variant: local.variant,
        shadow: local.shadow,
        color: local.color,
        className: local.class,
      })}
      {...rest}
    />
  );
};
