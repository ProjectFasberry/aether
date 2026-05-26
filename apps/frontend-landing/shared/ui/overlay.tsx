import { mergeProps, splitProps, JSX } from 'solid-js';
import { tv, type VariantProps } from 'tailwind-variants';

const overlayVariants = tv({
  base: `block absolute right-0 left-0 bg-gradient-to-tr from-black/80 to-transparent h-full`,
  variants: {
    variant: {
      default: "to-55%",
      over: "to-90%",
      mini: "to-20%",
      screen: "top-0 right-0 left-0 z-10 bg-black/30 min-h-screen"
    }
  },
  defaultVariants: {
    variant: "default"
  }
});

export type OverlayVariantsProps = JSX.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof overlayVariants> & {
  className?: string;
}

export const Overlay = (props: OverlayVariantsProps) => {
  const merged = mergeProps({ variant: "default" }, props);
  const [local, rest] = splitProps(merged, ['variant', 'class', 'className']);

  return (
    <div
      class={overlayVariants({
        variant: local.variant as OverlayVariantsProps["variant"],
        className: local.class || local.className
      })}
      {...rest}
    />
  );
};
