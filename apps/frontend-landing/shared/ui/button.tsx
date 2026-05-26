import { mergeProps, splitProps, JSX, Show } from "solid-js";
import { tv, type VariantProps } from "tailwind-variants";
import { Icon } from "./icon";

const buttonVariants = tv({
  base: `inline-flex px-4 py-2 rounded-xl duration-300 ease-in-out cursor-pointer items-center justify-center
    disabled:select-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-70
  `,
  variants: {
    variant: {
      default: "border-none border-transparent",
      danger: "border border-red text-red",
      minecraft: "rounded-none button",
    },
    background: {
      default: "bg-neutral-800 hover:bg-neutral-700 text-neutral-50",
      compound: "bg-neutral-800 text-neutral-50",
      white: "bg-neutral-200 hover:bg-neutral-50 text-neutral-950",
      positive: "bg-gradient-to-br text-neutral-50 from-green-600/90 via-green-600/80 font-semibold to-green-600/80",
    },
  },
});

type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> &
  (
    | {
        withSpinner?: true;
        isLoading: boolean;
      }
    | {
        withSpinner?: false;
        isLoading?: never;
      }
  ) & {
    className?: string;
  };

export const Button = (props: ButtonProps) => {
  const merged = mergeProps({ variant: undefined, background: undefined, withSpinner: false, isLoading: false }, props);

  const [local, rest] = splitProps(merged, [
    "class",
    "className",
    "isLoading",
    "withSpinner",
    "background",
    "variant",
    "children",
  ]);

  return (
    <button
      class={buttonVariants({
        className: local.class || local.className,
        background: local.background,
        variant: local.variant,
      })}
      {...rest}
    >
      <Show when={local.withSpinner && local.isLoading}>
        <Icon name="sprite:loader-2" class="animate-spin duration-300 mr-1 size-[14px]" />
      </Show>
      {local.children}
    </button>
  );
};
