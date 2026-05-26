import { splitProps, JSX } from 'solid-js';
import { tv } from 'tailwind-variants';

const skeleton = tv({
  slots: {
    rel: `isolate bg-white/10 rounded-lg overflow-hidden shadow-xl shadow-black/5 before:border-t
  before:border-green-500/10 relative
    before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent
  before:via-green-500/10 before:to-transparent`,
    child: `bg-gradient-to-r from-transparent via-green-500/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]`
  }
});

const { child, rel } = skeleton();

type SkeletonProps = JSX.HTMLAttributes<HTMLDivElement> & {
  className?: string;
};;

export function Skeleton(props: SkeletonProps) {
  const [local, rest] = splitProps(props, ['class', 'className']);

  return (
    <div
      class={rel({ className: local.class || local.className })}
      {...rest}
    >
      <div class={child()} />
    </div>
  );
}
