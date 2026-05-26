import { mergeProps, splitProps, JSX } from "solid-js";
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

type LayoutVariantsProps = JSX.HTMLAttributes<HTMLDivElement> & VariantProps<typeof layoutVars> & {
  className?: string
}

export const MainWrapperPage = (props: LayoutVariantsProps) => {
  const merged = mergeProps({ variant: 'default' }, props);

  const [local, rest] = splitProps(merged, ['variant', 'class', 'className']);

  return (
    <div
      class={layoutVars({
        variant: local.variant as LayoutVariantsProps["variant"],
        className: local.class || local.className
      })}
      {...rest}
    />
  );
};
