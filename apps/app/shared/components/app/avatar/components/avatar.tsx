import { HTMLAttributes } from 'react';
import { tv, VariantProps } from 'tailwind-variants';
import { getStaticImage } from '@/shared/lib/volume-helpers';

export const avatarVariants = tv({
  base: `relative rounded-lg aspect-square border border-neutral-800/20`,
  variants: {
    variant: {
      default: 'min-h-16 min-w-16 w-16 h-16 max-w-16 max-h-16',
    }
  },
})

type AvatarProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof avatarVariants> & {
  withStatus?: boolean,
  nickname?: string;
  url: string
}

export const Avatar = ({ className, variant, url, nickname, ...props }: AvatarProps) => {
  const fallback = getStaticImage("fallback/steve_head.png");

  const handleRef = (img: HTMLImageElement | null) => {
    if (!img) return;

    if (img.complete && img.naturalWidth === 0) {
      img.src = fallback;
    }
  };

  return (
    <div
      className={avatarVariants({ variant, className })}
      {...props}
    >
      <img
        ref={handleRef}
        src={url}
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = fallback;
        }}
        className="rounded-sm w-full h-full"
        loading="eager"
        alt={nickname ?? `Avatar`}
        crossOrigin="anonymous"
      />
    </div>
  )
}